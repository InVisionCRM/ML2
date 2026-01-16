
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IWrappedPulse is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

interface IPulseXRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/**
 * @title MegaMorbiusLottery
 * @notice 6-of-55 lottery with fixed prize brackets, MegaMORBIUS progressive jackpot, donations, and WPLS payment support
 * @dev Distribution (applied ONLY on ticket purchases, NOT rollovers):
 *      - 5% to Keeper wallet
 *      - 5% to Deployer wallet
 *      - 10% to Burn (dead address)
 *      - 10% to MegaMORBIUS Bank (progressive jackpot)
 *      - 70% to Winners Pool (prize brackets)
 *      - Fixed prize brackets: 100, 250, 750, 2000, 5000, 15000 MORBIUS
 *      - MegaMORBIUS progressive: 35% to 5-matches, 65% to 6-matches whenever jackpot is won
 *      - Donations: Direct contributions to prize pool or MegaMORBIUS jackpot
 *      - Smart rollover: Unclaimed prizes → 100% next round winners pool
 *      - WPLS payment with auto-swap to MORBIUS (accounts for 5.5% tax + 5% slippage)
 */
contract MegaMorbiusLottery is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    IERC20 public immutable MORBIUS_TOKEN;
    IWrappedPulse public immutable WPLS_TOKEN;
    IPulseXRouter public immutable pulseXRouter;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant TICKET_PRICE_DEFAULT = 100 * 1e18; // 100 MORBIUS (18 decimals)
    uint8 public constant NUMBERS_PER_TICKET = 6;
    uint8 public constant MIN_NUMBER = 1;
    uint8 public constant MAX_NUMBER = 55;
    // Distribution percentages (basis points, 1% = 100 bp)
    // ONLY applied on ticket purchases, NOT on rollovers
    uint256 public constant KEEPER_FEE_PCT = 500; // 5% to keeper
    uint256 public constant DEPLOYER_FEE_PCT = 500; // 5% to deployer
    uint256 public constant BURN_PCT = 1000; // 10% burn (only on purchases)
    uint256 public constant MEGA_BANK_PCT = 1000; // 10% to MegaMORBIUS (only on purchases)
    uint256 public constant WINNERS_POOL_PCT = 7000; // 70% to winners
    uint256 public constant TOTAL_PCT = 10000; // 100%
    uint256 public constant MAX_FUTURE_ROUND_OFFSET = 100; // allow scheduling up to 100 rounds ahead

    // Fixed bracket amounts in MORBIUS (18 decimals)
    // Progressive prizes favoring higher matches
    uint256[6] public BRACKET_AMOUNTS = [100e18, 250e18, 750e18, 2000e18, 5000e18, 15000e18];
    // Bracket 1: 100 MORBIUS, Bracket 2: 250 MORBIUS, Bracket 3: 750 MORBIUS, Bracket 4: 2000 MORBIUS, Bracket 5: 5000 MORBIUS, Bracket 6: 15000 MORBIUS

    // Rollover rule: unclaimed pools → 100% to next round winners pool
    uint256 public constant ROLLOVER_TO_NEXT_ROUND_PCT = 10000; // 100%
    uint256 public constant ROLLOVER_TO_BURN_PCT = 0; // 0%
    uint256 public constant ROLLOVER_TO_MEGA_PCT = 0; // 0%

    // WPLS swap buffer (50% extra for PLS users)
    uint256 public constant WPLS_SWAP_BUFFER_PCT = 15000; // 50% extra


    // ============ Enums ============

    enum RoundState { OPEN, FINALIZED }

    // ============ Structs ============

    struct Ticket {
        address player;
        uint8[6] numbers;
        uint256 ticketId;
        bool isFreeTicket;
        bool isHouseTicket;
    }

    struct BracketWinners {
        uint256 matchCount;
        uint256 poolAmount;
        uint256 winnerCount;
        uint256 payoutPerWinner;
        uint256[] winningTicketIds;
    }

    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        uint256 closingBlock; // Block when round was locked
        uint256 drawBlock; // Future block to use for randomness
        uint8[6] winningNumbers;
        uint256 totalMORBIUSCollected; // Full amount collected from players (100%)
        uint256 totalTickets;
        uint256 uniquePlayers;
        BracketWinners[6] brackets;
        uint256 megaBankContribution;
        RoundState state;
    }

    // ============ State Variables ============

    address public keeperWallet;
    address public deployerWallet;

    uint256 public roundDuration;
    uint256 public currentRoundId;
    uint256 public currentRoundStartTime;
    RoundState public currentRoundState;

    // Ticket pricing (modifiable by owner)
    uint256 public ticketPriceMORBIUS;
    uint256 public ticketPricePls;

    // Banks
    uint256 public megaMORBIUSBank;
    uint256 public rolloverReserve; // carries 75% of unclaimed bracket pools to next round winners pool
    mapping(uint256 => uint256) public pendingRoundMORBIUS; // prepaid MORBIUS for future rounds
    mapping(uint256 => uint256) public pendingRoundTickets; // prepaid ticket counts for future rounds
    mapping(uint256 => uint256) public futureRoundTotals; // winners pool allocation for future rounds

    // Current round tracking
    uint256 public currentRoundTotalMORBIUS; // Only winners pool (70% of purchases + rollovers)
    uint256 public currentRoundTotalCollectedFromPlayers; // Full amount collected from ticket sales
    uint256 public currentRoundTotalTickets;
    uint256 public nextTicketId;

    // Burn accumulator removed - burns happen immediately

    // Lifetime counters
    uint256 public totalTicketsEver;
    uint256 public totalMORBIUSEverCollected;
    uint256 public totalMORBIUSEverClaimed;
    uint256 public totalMORBIUSClaimableOutstanding;

    // Mappings
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Ticket[]) public roundTickets;
    mapping(uint256 => mapping(address => uint256[])) public playerTicketIds;
    mapping(uint256 => mapping(address => bool)) public hasEnteredRound;
    mapping(uint256 => address[]) public roundPlayers;

    // Claiming system
    mapping(uint256 => mapping(address => uint256)) public claimableWinnings;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(address => uint256) public playerOutstandingClaimable;

    struct PlayerTotals {
        uint256 ticketsBought;
        uint256 totalSpent;
        uint256 totalClaimed;
    }
    mapping(address => PlayerTotals) public playerTotals;
    mapping(address => uint256[]) private playerRounds;
    mapping(address => mapping(uint256 => bool)) private playerRoundSeen;

    // House tickets removed - no phantom tickets

    // ============ Events ============

    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime);
    event TicketsPurchased(address indexed player, uint256 indexed roundId, uint256 ticketCount, uint256 freeTicketsUsed, uint256 MORBIUSSpent);
    event TicketsPurchasedForRounds(address indexed player, uint256[] roundIds, uint256[] ticketCounts, uint256 MORBIUSSpent);
    event WPLSSwappedForTickets(address indexed player, uint256 wplsSpent, uint256 MORBIUSReceived);
    event NumbersDrawn(uint256 indexed roundId, uint8[6] winningNumbers, uint256 drawBlock);
    event RoundFinalized(uint256 indexed roundId, uint8[6] winningNumbers, uint256 totalMORBIUS, uint256 totalTickets, uint256 uniquePlayers);
    event BracketResults(uint256 indexed roundId, uint256 bracket, uint256 winnerCount, uint256 poolAmount, uint256 payoutPerWinner);
    event MegaMORBIUSDistributed(uint256 indexed roundId, uint256 bankAmount, uint256 toBracket6, uint256 toBracket5);
    event WinningsClaimed(address indexed player, uint256 indexed roundId, uint256 amount);
    event RoundDurationUpdated(uint256 oldDuration, uint256 newDuration);
    event UnclaimedPrizeRolledOver(uint256 indexed roundId, uint256 bracket, uint256 amount, string destination);
    event TicketPricesUpdated(uint256 MORBIUSPrice, uint256 plsPrice);
    event BurnExecuted(uint256 amount);
    event PoolDonation(address indexed donor, uint256 amount, uint256 roundId);
    event MegaMORBIUSDonation(address indexed donor, uint256 amount, uint256 roundId);

    // ============ Constructor ============

    constructor(
        address _MORBIUSTokenAddress,
        address _wplsTokenAddress,
        address _pulseXRouterAddress,
        uint256 _initialRoundDuration,
        address _keeperWallet,
        address _deployerWallet
    ) Ownable(msg.sender) {
        require(_MORBIUSTokenAddress != address(0), "Invalid MORBIUS address");
        require(_wplsTokenAddress != address(0), "Invalid WPLS address");
        require(_pulseXRouterAddress != address(0), "Invalid router address");
        require(_initialRoundDuration > 0, "Duration must be positive");
        require(_keeperWallet != address(0), "Invalid keeper address");
        require(_deployerWallet != address(0), "Invalid deployer address");

        MORBIUS_TOKEN = IERC20(_MORBIUSTokenAddress);
        WPLS_TOKEN = IWrappedPulse(_wplsTokenAddress);
        pulseXRouter = IPulseXRouter(_pulseXRouterAddress);
        roundDuration = _initialRoundDuration;
        keeperWallet = _keeperWallet;
        deployerWallet = _deployerWallet;

        ticketPriceMORBIUS = TICKET_PRICE_DEFAULT;
        // PLS price will be calculated dynamically in buyTicketsWithPLS

        // Start with round 1 OPEN to allow immediate ticket purchases
        currentRoundState = RoundState.OPEN;
        currentRoundId = 1;
        currentRoundStartTime = block.timestamp;
    }

    // ============ Public Functions ============

    /**
     * @notice Buy lottery tickets with MORBIUS
     */
    function buyTickets(uint8[6][] calldata ticketNumbers) external nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(currentRoundState == RoundState.OPEN, "Round not open");
        require(ticketNumbers.length > 0, "Must buy at least 1 ticket");
        require(ticketNumbers.length <= 100, "Max 100 tickets per tx");

        uint256 ticketsToBuy = ticketNumbers.length;
        uint256 MORBIUSRequired = ticketsToBuy * ticketPriceMORBIUS;

        if (MORBIUSRequired > 0) {
            // Transfer full amount from player
            MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), MORBIUSRequired);

            // Calculate distribution (ONLY on purchases, NOT rollovers)
            uint256 keeperFee = (MORBIUSRequired * KEEPER_FEE_PCT) / TOTAL_PCT;
            uint256 deployerFee = (MORBIUSRequired * DEPLOYER_FEE_PCT) / TOTAL_PCT;
            uint256 burnAmount = (MORBIUSRequired * BURN_PCT) / TOTAL_PCT;
            uint256 megaContribution = (MORBIUSRequired * MEGA_BANK_PCT) / TOTAL_PCT;
            uint256 toWinnersPool = MORBIUSRequired - keeperFee - deployerFee - burnAmount - megaContribution;

            // Distribute immediately
            if (keeperFee > 0) {
                MORBIUS_TOKEN.safeTransfer(keeperWallet, keeperFee);
            }
            if (deployerFee > 0) {
                MORBIUS_TOKEN.safeTransfer(deployerWallet, deployerFee);
            }
            if (burnAmount > 0) {
                _accrueBurn(burnAmount);
            }
            if (megaContribution > 0) {
                megaMORBIUSBank += megaContribution;
            }

            // Only the winners pool (70%) goes to the round
            currentRoundTotalMORBIUS += toWinnersPool;
            currentRoundTotalCollectedFromPlayers += MORBIUSRequired; // Track full amount for display
            totalMORBIUSEverCollected += MORBIUSRequired;
            totalTicketsEver += ticketsToBuy;
            playerTotals[msg.sender].ticketsBought += ticketsToBuy;
            playerTotals[msg.sender].totalSpent += MORBIUSRequired;
        }

        _processTickets(msg.sender, ticketNumbers, currentRoundId);

        emit TicketsPurchased(msg.sender, currentRoundId, ticketNumbers.length, 0, MORBIUSRequired);
    }

    /**
     * @notice Buy tickets for multiple future rounds (MORBIUS only)
     * @param ticketGroups Array of ticket arrays per round offset (uint8[6][] per round)
     * @param roundOffsets Array of offsets (0 = current round, 1 = next, etc.)
     */
    function buyTicketsForRounds(
        uint8[6][][] calldata ticketGroups,
        uint256[] calldata roundOffsets
    ) external nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(ticketGroups.length > 0, "No tickets");
        require(ticketGroups.length == roundOffsets.length, "Length mismatch");

        uint256 totalTickets = 0;
        uint256 totalCost = 0;
        uint256[] memory targetRoundIds = new uint256[](ticketGroups.length);
        uint256[] memory ticketCounts = new uint256[](ticketGroups.length);

        for (uint256 i = 0; i < ticketGroups.length; i++) {
            uint256 offset = roundOffsets[i];
            require(offset <= MAX_FUTURE_ROUND_OFFSET, "Offset too large");
            uint256 targetRoundId = currentRoundId + offset;
            targetRoundIds[i] = targetRoundId;

            uint256 count = ticketGroups[i].length;
            require(count > 0, "Empty ticket group");
            require(count <= 100, "Max 100 tickets per group");

            ticketCounts[i] = count;
            totalTickets += count;
            totalCost += count * ticketPriceMORBIUS;
        }

        require(totalTickets > 0, "No tickets");
        require(totalTickets <= 500, "Too many tickets");

        if (totalCost > 0) {
            MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), totalCost);
            totalMORBIUSEverCollected += totalCost;
            totalTicketsEver += totalTickets;
            playerTotals[msg.sender].ticketsBought += totalTickets;
            playerTotals[msg.sender].totalSpent += totalCost;
        }

        // Allocate tickets per target round and track balances
        for (uint256 i = 0; i < ticketGroups.length; i++) {
            uint256 targetRoundId = targetRoundIds[i];
            uint256 count = ticketCounts[i];
            uint8[6][] calldata ticketsForRound = ticketGroups[i];

            _processTickets(msg.sender, ticketsForRound, targetRoundId);

            if (targetRoundId == currentRoundId) {
                currentRoundTotalMORBIUS += count * ticketPriceMORBIUS;
            } else {
                pendingRoundMORBIUS[targetRoundId] += count * ticketPriceMORBIUS;
            }
        }

        emit TicketsPurchasedForRounds(msg.sender, targetRoundIds, ticketCounts, totalCost);
    }

    /**
     * @notice Buy lottery tickets with WPLS (auto-swaps to MORBIUS)
     */
    function buyTicketsWithWPLS(uint8[6][] calldata ticketNumbers) external nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(currentRoundState == RoundState.OPEN, "Round not open");
        require(ticketNumbers.length > 0, "Must buy at least 1 ticket");
        require(ticketNumbers.length <= 100, "Max 100 tickets per tx");

        uint256 ticketsToBuy = ticketNumbers.length;
        uint256 MORBIUSRequired = ticketsToBuy * ticketPriceMORBIUS;

        if (MORBIUSRequired > 0) {
            // Account for 50% buffer for PLS users
            uint256 MORBIUSToRequest = (MORBIUSRequired * WPLS_SWAP_BUFFER_PCT) / TOTAL_PCT;

            address[] memory path = new address[](2);
            path[0] = address(WPLS_TOKEN);
            path[1] = address(MORBIUS_TOKEN);

            uint256[] memory amountsIn = pulseXRouter.getAmountsIn(MORBIUSToRequest, path);
            uint256 wplsForMORBIUS = amountsIn[0];

            // Add 5% keeper fee in PLS
            uint256 keeperFeeWpls = (wplsForMORBIUS * 500) / TOTAL_PCT; // 5% of swap amount
            uint256 totalWplsNeeded = wplsForMORBIUS + keeperFeeWpls;

            // Transfer total WPLS from user
            IERC20(address(WPLS_TOKEN)).safeTransferFrom(msg.sender, address(this), totalWplsNeeded);

            // Send keeper fee directly in PLS
            IERC20(address(WPLS_TOKEN)).safeTransfer(keeperWallet, keeperFeeWpls);

            // Approve remaining WPLS for swap
            uint256 wplsToSwap = wplsForMORBIUS; // wplsForMORBIUS amount (keeper fee already separated)
            IERC20(address(WPLS_TOKEN)).approve(address(pulseXRouter), wplsToSwap);

            uint256 MORBIUSBefore = MORBIUS_TOKEN.balanceOf(address(this));

            // Set amountOutMin to 0 to avoid revert due to tax/slippage
            // We verify the actual received amount after the swap instead
            pulseXRouter.swapExactTokensForTokens(
                wplsToSwap,
                0,  // Allow any amount, we check MORBIUSReceived below
                path,
                address(this),
                block.timestamp + 300
            );

            uint256 MORBIUSReceived = MORBIUS_TOKEN.balanceOf(address(this)) - MORBIUSBefore;
            require(MORBIUSReceived >= MORBIUSRequired, "Insufficient MORBIUS after swap");

            // Apply same fee structure as MORBIUS purchases (on the base amount)
            // Note: Keeper fee is already taken in WPLS, so we don't calculate it here
            uint256 fees = (MORBIUSRequired * (DEPLOYER_FEE_PCT + BURN_PCT + MEGA_BANK_PCT)) / TOTAL_PCT;
            uint256 toWinnersPool = MORBIUSRequired - fees;

            // Note: Keeper fee for PLS is already taken in WPLS above, so we don't transfer MORBIUS keeper fee
            // But we still apply the other fees proportionally
            uint256 deployerFee = (MORBIUSRequired * DEPLOYER_FEE_PCT) / TOTAL_PCT;
            uint256 burnAmount = (MORBIUSRequired * BURN_PCT) / TOTAL_PCT;
            uint256 megaContribution = (MORBIUSRequired * MEGA_BANK_PCT) / TOTAL_PCT;

            if (deployerFee > 0) {
                MORBIUS_TOKEN.safeTransfer(deployerWallet, deployerFee);
            }
            if (burnAmount > 0) {
                _accrueBurn(burnAmount);
            }
            if (megaContribution > 0) {
                megaMORBIUSBank += megaContribution;
            }

            // Add only the winners pool portion (70%) to the round pool
            currentRoundTotalMORBIUS += toWinnersPool;
            currentRoundTotalCollectedFromPlayers += MORBIUSRequired; // Track full amount for display
            totalMORBIUSEverCollected += MORBIUSReceived; // Total collected includes fees
            totalTicketsEver += ticketsToBuy;
            playerTotals[msg.sender].ticketsBought += ticketsToBuy;
            playerTotals[msg.sender].totalSpent += MORBIUSReceived;

            emit WPLSSwappedForTickets(msg.sender, totalWplsNeeded, MORBIUSReceived);
        }

        _processTickets(msg.sender, ticketNumbers, currentRoundId);

        emit TicketsPurchased(msg.sender, currentRoundId, ticketNumbers.length, 0, MORBIUSRequired);
    }

    /**
     * @notice Buy lottery tickets with WPLS and a caller-specified extra buffer
     * @dev Adds extraBufferBp (basis points) on top of the built-in swap buffer
     * @param ticketNumbers Ticket selections
     * @param extraBufferBp Extra buffer in basis points (0 - 10_000) added to WPLS_SWAP_BUFFER_PCT
     */
    function buyTicketsWithWPLSAndBuffer(
        uint8[6][] calldata ticketNumbers,
        uint256 extraBufferBp
    ) external nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(currentRoundState == RoundState.OPEN, "Round not open");
        require(ticketNumbers.length > 0, "Must buy at least 1 ticket");
        require(ticketNumbers.length <= 100, "Max 100 tickets per tx");
        require(extraBufferBp <= TOTAL_PCT, "Extra buffer too large"); // cap at +100%

        uint256 ticketsToBuy = ticketNumbers.length;
        uint256 MORBIUSRequired = ticketsToBuy * ticketPriceMORBIUS;

        if (MORBIUSRequired > 0) {
            // Apply base buffer (tax/slippage) and caller-provided extra buffer
            uint256 baseBuffered = (MORBIUSRequired * WPLS_SWAP_BUFFER_PCT) / TOTAL_PCT;
            uint256 MORBIUSToRequest = (baseBuffered * (TOTAL_PCT + extraBufferBp)) / TOTAL_PCT;

            address[] memory path = new address[](2);
            path[0] = address(WPLS_TOKEN);
            path[1] = address(MORBIUS_TOKEN);

            uint256[] memory amountsIn = pulseXRouter.getAmountsIn(MORBIUSToRequest, path);
            uint256 wplsNeeded = amountsIn[0];

            IERC20(address(WPLS_TOKEN)).safeTransferFrom(msg.sender, address(this), wplsNeeded);
            IERC20(address(WPLS_TOKEN)).approve(address(pulseXRouter), wplsNeeded);

            uint256 MORBIUSBefore = MORBIUS_TOKEN.balanceOf(address(this));

            // Keep amountOutMin at 0; enforce received amount via post-swap check
            pulseXRouter.swapExactTokensForTokens(
                wplsNeeded,
                0,
                path,
                address(this),
                block.timestamp + 300
            );

            uint256 MORBIUSReceived = MORBIUS_TOKEN.balanceOf(address(this)) - MORBIUSBefore;
            require(MORBIUSReceived >= MORBIUSRequired, "Insufficient MORBIUS after swap");

            currentRoundTotalMORBIUS += MORBIUSReceived;
            totalMORBIUSEverCollected += MORBIUSReceived;
            totalTicketsEver += ticketsToBuy;
            playerTotals[msg.sender].ticketsBought += ticketsToBuy;
            playerTotals[msg.sender].totalSpent += MORBIUSReceived;
            emit WPLSSwappedForTickets(msg.sender, wplsNeeded, MORBIUSReceived);
        }

        _processTickets(msg.sender, ticketNumbers, currentRoundId);

        emit TicketsPurchased(msg.sender, currentRoundId, ticketNumbers.length, 0, MORBIUSRequired);
    }

    /**
     * @notice Buy lottery tickets with native PLS (wraps to WPLS then swaps to MORBIUS)
     * @dev Accepts msg.value in beats, applies the same swap buffer used for WPLS purchases,
     *      takes 5% keeper fee in PLS, and refunds any excess PLS to the caller.
     *      Applies same fee structure as MORBIUS purchases.
     */
    function buyTicketsWithPLS(uint8[6][] calldata ticketNumbers) external payable nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(currentRoundState == RoundState.OPEN, "Round not open");
        require(ticketNumbers.length > 0, "Must buy at least 1 ticket");
        require(ticketNumbers.length <= 100, "Max 100 tickets per tx");

        uint256 ticketsToBuy = ticketNumbers.length;
        uint256 MORBIUSRequired = ticketsToBuy * ticketPriceMORBIUS;

        if (MORBIUSRequired > 0) {
            // Calculate fair PLS price: MORBIUS_price * amount_needed * 1.5_tax + buffer
            address[] memory path = new address[](2);
            path[0] = address(WPLS_TOKEN);
            path[1] = address(MORBIUS_TOKEN);

            // Get current PLS price for the required MORBIUS
            uint256[] memory amountsIn = pulseXRouter.getAmountsIn(MORBIUSRequired, path);
            uint256 basePlsCost = amountsIn[0];

            // Add 50% tax to discourage PLS payments
            uint256 taxedAmount = (basePlsCost * 15000) / 10000;

            // Add 20% buffer for slippage and fees
            uint256 totalPlsRequired = (taxedAmount * 12000) / 10000;

            // Split: 5% to keeper, rest for swap
            uint256 keeperFee = (totalPlsRequired * KEEPER_FEE_PCT) / TOTAL_PCT;
            uint256 swapAmount = totalPlsRequired - keeperFee;

            require(msg.value == totalPlsRequired, "Send exact PLS amount required");

            // Send keeper fee
            payable(keeperWallet).transfer(keeperFee);

            // Wrap PLS for swap
            WPLS_TOKEN.deposit{value: swapAmount}();
            IERC20(address(WPLS_TOKEN)).approve(address(pulseXRouter), swapAmount);

            uint256 MORBIUSBefore = MORBIUS_TOKEN.balanceOf(address(this));

            pulseXRouter.swapExactTokensForTokens(
                swapAmount,
                0, // allow any output; enforce via received check
                path,
                address(this),
                block.timestamp + 300
            );

            uint256 MORBIUSReceived = MORBIUS_TOKEN.balanceOf(address(this)) - MORBIUSBefore;
            require(MORBIUSReceived >= MORBIUSRequired, "Insufficient MORBIUS after swap");

            // No refunds - exact payment required

            // Apply same fee structure as MORBIUS purchases (on the base amount)
            uint256 deployerFee = (MORBIUSRequired * DEPLOYER_FEE_PCT) / TOTAL_PCT;
            uint256 burnAmount = (MORBIUSRequired * BURN_PCT) / TOTAL_PCT;
            uint256 megaContribution = (MORBIUSRequired * MEGA_BANK_PCT) / TOTAL_PCT;
            uint256 toWinnersPool = MORBIUSRequired - deployerFee - burnAmount - megaContribution;

            // Distribute fees
            if (deployerFee > 0) {
                MORBIUS_TOKEN.safeTransfer(deployerWallet, deployerFee);
            }
            if (burnAmount > 0) {
                _accrueBurn(burnAmount);
            }
            if (megaContribution > 0) {
                megaMORBIUSBank += megaContribution;
            }

            // Only the winners pool (70%) goes to the round
            currentRoundTotalMORBIUS += toWinnersPool;
            currentRoundTotalCollectedFromPlayers += MORBIUSRequired; // Track full amount for display
            totalMORBIUSEverCollected += MORBIUSRequired; // Count the base amount for consistency
            totalTicketsEver += ticketsToBuy;
            playerTotals[msg.sender].ticketsBought += ticketsToBuy;
            playerTotals[msg.sender].totalSpent += MORBIUSRequired;

            emit WPLSSwappedForTickets(msg.sender, totalPlsRequired, MORBIUSReceived);
        }

        _processTickets(msg.sender, ticketNumbers, currentRoundId);

        emit TicketsPurchased(msg.sender, currentRoundId, ticketNumbers.length, 0, MORBIUSRequired);
    }

    /**
     * @notice Buy tickets for multiple rounds using PLS (PulseChain native token)
     * @param ticketGroups Array of ticket arrays, one for each round
     * @param roundOffsets Array of round offsets (0 = current round, 1 = next round, etc.)
     */
    function buyTicketsWithPLSForRounds(
        uint8[6][][] calldata ticketGroups,
        uint256[] calldata roundOffsets
    ) external payable nonReentrant {
        if (_isRoundExpired()) {
            _finalizeRound();
            _startNewRound();
        }

        require(ticketGroups.length > 0, "No tickets");
        require(ticketGroups.length == roundOffsets.length, "Length mismatch");

        uint256 totalTickets = 0;
        uint256 totalMORBIUSRequired = 0;
        uint256[] memory targetRoundIds = new uint256[](ticketGroups.length);
        uint256[] memory ticketCounts = new uint256[](ticketGroups.length);

        // First pass: validate and calculate totals
        for (uint256 i = 0; i < ticketGroups.length; i++) {
            uint256 offset = roundOffsets[i];
            require(offset <= MAX_FUTURE_ROUND_OFFSET, "Offset too large");
            uint256 targetRoundId = currentRoundId + offset;
            targetRoundIds[i] = targetRoundId;

            uint256 count = ticketGroups[i].length;
            require(count > 0, "Empty ticket group");
            require(count <= 100, "Max 100 tickets per group");

            ticketCounts[i] = count;
            totalTickets += count;
            totalMORBIUSRequired += count * ticketPriceMORBIUS;
        }

        require(totalMORBIUSRequired > 0, "No tickets to buy");

        // Handle PLS payment calculation (same logic as single round)
        address[] memory path = new address[](2);
        path[0] = address(WPLS_TOKEN);
        path[1] = address(MORBIUS_TOKEN);

        // Get current PLS price for the total required MORBIUS
        uint256[] memory amountsIn = pulseXRouter.getAmountsIn(totalMORBIUSRequired, path);
        uint256 basePlsCost = amountsIn[0];

        // Add 50% tax to discourage PLS payments
        uint256 taxedAmount = (basePlsCost * 15000) / 10000;

        // Add 20% buffer for slippage and fees
        uint256 totalPlsRequired = (taxedAmount * 12000) / 10000;

        require(msg.value >= totalPlsRequired, "Insufficient PLS payment");

        // Process PLS payment and MORBIUS acquisition
        if (totalMORBIUSRequired > 0) {
            // Swap PLS for MORBIUS
            uint256[] memory swapAmounts = pulseXRouter.swapExactETHForTokens{value: totalPlsRequired}(
                totalMORBIUSRequired,
                path,
                address(this),
                block.timestamp + 300 // 5 minute deadline
            );
            uint256 MORBIUSReceived = swapAmounts[swapAmounts.length - 1];
            require(MORBIUSReceived >= totalMORBIUSRequired, "Swap failed");

            // Apply same fee structure as MORBIUS purchases
            uint256 deployerFee = (totalMORBIUSRequired * DEPLOYER_FEE_PCT) / TOTAL_PCT;
            uint256 burnAmount = (totalMORBIUSRequired * BURN_PCT) / TOTAL_PCT;
            uint256 megaContribution = (totalMORBIUSRequired * MEGA_BANK_PCT) / TOTAL_PCT;
            uint256 toWinnersPool = totalMORBIUSRequired - deployerFee - burnAmount - megaContribution;

            // Distribute fees
            if (deployerFee > 0) {
                MORBIUS_TOKEN.safeTransfer(deployerWallet, deployerFee);
            }
            if (burnAmount > 0) {
                _accrueBurn(burnAmount);
            }
            if (megaContribution > 0) {
                megaMORBIUSBank += megaContribution;
            }

            // Distribute to winners pools across rounds
            for (uint256 i = 0; i < ticketGroups.length; i++) {
                uint256 targetRoundId = targetRoundIds[i];
                uint256 ticketsForThisRound = ticketCounts[i];
                uint256 MORBIUSForThisRound = ticketsForThisRound * ticketPriceMORBIUS;
                uint256 winnersPoolForThisRound = (MORBIUSForThisRound * 7000) / 10000; // 70% to winners pool

                if (targetRoundId == currentRoundId) {
                    currentRoundTotalMORBIUS += winnersPoolForThisRound;
                } else {
                    futureRoundTotals[targetRoundId] += winnersPoolForThisRound;
                }
            }

            currentRoundTotalCollectedFromPlayers += totalMORBIUSRequired;
            totalMORBIUSEverCollected += totalMORBIUSRequired;
            totalTicketsEver += totalTickets;
            playerTotals[msg.sender].ticketsBought += totalTickets;
            playerTotals[msg.sender].totalSpent += totalMORBIUSRequired;

            emit WPLSSwappedForTickets(msg.sender, totalPlsRequired, MORBIUSReceived);
        }

        // Process tickets for each round
        for (uint256 i = 0; i < ticketGroups.length; i++) {
            uint256 targetRoundId = targetRoundIds[i];
            _processTickets(msg.sender, ticketGroups[i], targetRoundId);
        }

        // Refund excess PLS
        if (msg.value > totalPlsRequired) {
            uint256 refund = msg.value - totalPlsRequired;
            payable(msg.sender).transfer(refund);
        }

        emit TicketsPurchasedForRounds(msg.sender, targetRoundIds, ticketCounts, totalMORBIUSRequired);
    }

    /**
     * @notice Manually finalize the current round
     */
    function finalizeRound() external nonReentrant {
        require(_isRoundExpired(), "Round not expired");
        require(currentRoundState == RoundState.OPEN, "Round already finalized");

        _finalizeRound();
        _startNewRound();
    }

    /**
     * @notice Claim winnings from a specific round
     */
    function claimWinnings(uint256 roundId) external nonReentrant {
        require(rounds[roundId].state == RoundState.FINALIZED, "Round not finalized");
        require(!hasClaimed[roundId][msg.sender], "Already claimed");
        require(claimableWinnings[roundId][msg.sender] > 0, "Nothing to claim");

        uint256 amount = claimableWinnings[roundId][msg.sender];
        hasClaimed[roundId][msg.sender] = true;

        MORBIUS_TOKEN.safeTransfer(msg.sender, amount);
        totalMORBIUSClaimableOutstanding = totalMORBIUSClaimableOutstanding >= amount ? totalMORBIUSClaimableOutstanding - amount : 0;
        totalMORBIUSEverClaimed += amount;
        playerTotals[msg.sender].totalClaimed += amount;
        playerOutstandingClaimable[msg.sender] = playerOutstandingClaimable[msg.sender] >= amount ? playerOutstandingClaimable[msg.sender] - amount : 0;

        emit WinningsClaimed(msg.sender, roundId, amount);
    }

    /**
     * @notice Claim winnings from multiple rounds in a single transaction
     */
    function claimWinningsMultiple(uint256[] calldata roundIds) external nonReentrant {
        require(roundIds.length > 0, "Must specify at least one round");
        require(roundIds.length <= 50, "Max 50 rounds per claim");

        uint256 totalClaimed = 0;

        for (uint256 i = 0; i < roundIds.length; i++) {
            uint256 roundId = roundIds[i];
            require(rounds[roundId].state == RoundState.FINALIZED, "Round not finalized");
            require(!hasClaimed[roundId][msg.sender], "Already claimed this round");
            require(claimableWinnings[roundId][msg.sender] > 0, "Nothing to claim for this round");

            uint256 amount = claimableWinnings[roundId][msg.sender];
            hasClaimed[roundId][msg.sender] = true;
            totalClaimed += amount;

            // Update accounting per round
            totalMORBIUSClaimableOutstanding = totalMORBIUSClaimableOutstanding >= amount ? totalMORBIUSClaimableOutstanding - amount : 0;
            playerOutstandingClaimable[msg.sender] = playerOutstandingClaimable[msg.sender] >= amount ? playerOutstandingClaimable[msg.sender] - amount : 0;
            playerTotals[msg.sender].totalClaimed += amount;

            emit WinningsClaimed(msg.sender, roundId, amount);
        }

        // Single transfer for all rounds
        MORBIUS_TOKEN.safeTransfer(msg.sender, totalClaimed);
        totalMORBIUSEverClaimed += totalClaimed;
    }

    /**
     * @notice Update round duration (owner only)
     */
    function updateRoundDuration(uint256 _newDuration) external onlyOwner {
        require(_newDuration > 0, "Duration must be positive");
        uint256 oldDuration = roundDuration;
        roundDuration = _newDuration;
        emit RoundDurationUpdated(oldDuration, _newDuration);
    }


    /**
     * @notice Update ticket prices for MORBIUS and PLS payment paths
     * @param newMORBIUSPrice Price per ticket when paying in MORBIUS (18 decimals)
     * @param newPlsPrice Price per ticket when paying in native PLS (beats)
     */
    function updateTicketPrices(uint256 newMORBIUSPrice, uint256 newPlsPrice) external onlyOwner {
        require(newMORBIUSPrice > 0, "MORBIUS price must be positive");
        require(newPlsPrice > 0, "PLS price must be positive");
        ticketPriceMORBIUS = newMORBIUSPrice;
        ticketPricePls = newPlsPrice;
        emit TicketPricesUpdated(newMORBIUSPrice, newPlsPrice);
    }

    /**
     * @notice Donate MORBIUS directly to the current round's prize pool
     * @param amount Amount of MORBIUS to donate (in wei, no restrictions)
     */
    function donateToPool(uint256 amount) external {
        // Transfer MORBIUS from donor to contract
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), amount);

        // Add entire amount to current round pool (no fees on donations)
        currentRoundTotalMORBIUS += amount;
        totalMORBIUSEverCollected += amount;

        // Track donor stats
        playerTotals[msg.sender].totalSpent += amount;

        emit PoolDonation(msg.sender, amount, currentRoundId);
    }

    /**
     * @notice Donate MORBIUS directly to the MegaMORBIUS progressive jackpot
     * @param amount Amount of MORBIUS to donate (in wei, no restrictions)
     */
    function donateToMegaMORBIUS(uint256 amount) external {
        // Transfer MORBIUS from donor to contract
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), amount);

        // Add entire amount to MegaMORBIUS bank (progressive jackpot)
        megaMORBIUSBank += amount;
        totalMORBIUSEverCollected += amount;

        // Track donor stats
        playerTotals[msg.sender].totalSpent += amount;

        emit MegaMORBIUSDonation(msg.sender, amount, currentRoundId);
    }

    // ============ View Functions ============

    function getCurrentRoundInfo() external view returns (
        uint256 roundId,
        uint256 startTime,
        uint256 endTime,
        uint256 totalMORBIUS,
        uint256 totalTickets,
        uint256 uniquePlayers,
        uint256 timeRemaining,
        RoundState state
    ) {
        roundId = currentRoundId;
        startTime = currentRoundStartTime;
        endTime = currentRoundStartTime + roundDuration;
        totalMORBIUS = currentRoundTotalMORBIUS;
        totalTickets = currentRoundTotalTickets;
        uniquePlayers = roundPlayers[currentRoundId].length;
        timeRemaining = block.timestamp >= endTime ? 0 : endTime - block.timestamp;
        state = currentRoundState;
    }

    function getPlayerTickets(uint256 roundId, address player) external view returns (Ticket[] memory) {
        uint256[] memory ticketIds = playerTicketIds[roundId][player];
        Ticket[] memory tickets = new Ticket[](ticketIds.length);
        Ticket[] storage allTickets = roundTickets[roundId];
        uint256 foundCount = 0;

        for (uint256 i = 0; i < allTickets.length && foundCount < ticketIds.length; i++) {
            if (allTickets[i].player == player) {
                tickets[foundCount] = allTickets[i];
                foundCount++;
            }
        }

        return tickets;
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getMegaMORBIUSBank() external view returns (uint256) {
        return megaMORBIUSBank;
    }

    function getClaimableWinnings(uint256 roundId, address player) external view returns (uint256) {
        return claimableWinnings[roundId][player];
    }

    function getCurrentRoundTotals() external view returns (
        uint256 roundId,
        uint256 totalMORBIUS,
        uint256 totalTickets,
        uint256 uniquePlayers,
        uint256 rolloverBalance,
        uint256 megaMORBIUSBalance,
        RoundState state
    ) {
        roundId = currentRoundId;
        totalMORBIUS = currentRoundTotalMORBIUS;
        totalTickets = currentRoundTotalTickets;
        uniquePlayers = roundPlayers[currentRoundId].length;
        rolloverBalance = rolloverReserve;
        megaMORBIUSBalance = megaMORBIUSBank;
        state = currentRoundState;
    }

    function getPendingForRound(uint256 roundId) external view returns (uint256 MORBIUSAmount, uint256 ticketCount) {
        MORBIUSAmount = pendingRoundMORBIUS[roundId];
        ticketCount = pendingRoundTickets[roundId];
    }

    function getRolloverState() external view returns (uint256 rolloverBalance, uint256 megaMORBIUSBalance) {
        rolloverBalance = rolloverReserve;
        megaMORBIUSBalance = megaMORBIUSBank;
    }

    function getBracketConfig() external view returns (
        uint256[6] memory bracketAmounts,
        uint256 winnersPoolPercent,
        uint256 burnPercent,
        uint256 megaBankPercent,
        uint256 keeperFeePercent,
        uint256 deployerFeePercent
    ) {
        bracketAmounts = BRACKET_AMOUNTS;
        winnersPoolPercent = WINNERS_POOL_PCT;
        burnPercent = BURN_PCT;
        megaBankPercent = MEGA_BANK_PCT;
        keeperFeePercent = KEEPER_FEE_PCT;
        deployerFeePercent = DEPLOYER_FEE_PCT;
    }

    function getUnclaimedForRound(uint256 roundId) external view returns (
        uint256[] memory poolAmounts,
        uint256[] memory winnerCounts,
        uint256[] memory paidPerBracket,
        uint256[] memory unclaimedPerBracket,
        uint256 totalUnclaimed,
        uint256 winnersPoolTotal,
        uint256 burnTotal,
        uint256 megaTotal
    ) {
        Round storage r = rounds[roundId];
        poolAmounts = new uint256[](6);
        winnerCounts = new uint256[](6);
        paidPerBracket = new uint256[](6);
        unclaimedPerBracket = new uint256[](6);

        winnersPoolTotal = (r.totalMORBIUSCollected * WINNERS_POOL_PCT) / TOTAL_PCT;
        burnTotal = (r.totalMORBIUSCollected * BURN_PCT) / TOTAL_PCT;
        megaTotal = (r.totalMORBIUSCollected * MEGA_BANK_PCT) / TOTAL_PCT;

        for (uint256 i = 0; i < 6; i++) {
            BracketWinners storage bw = r.brackets[i];
            poolAmounts[i] = bw.poolAmount;
            winnerCounts[i] = bw.winnerCount;
            uint256 paid = bw.payoutPerWinner * bw.winnerCount;
            paidPerBracket[i] = paid;
            uint256 unclaimed = bw.poolAmount > paid ? bw.poolAmount - paid : 0;
            unclaimedPerBracket[i] = unclaimed;
            totalUnclaimed += unclaimed;
        }
    }

    function getTotalTicketsEver() external view returns (uint256) {
        return totalTicketsEver;
    }

    function getTotalMORBIUSEverCollected() external view returns (uint256) {
        return totalMORBIUSEverCollected;
    }

    function getTotalMORBIUSEverClaimed() external view returns (uint256) {
        return totalMORBIUSEverClaimed;
    }

    function getTotalMORBIUSClaimableAll() external view returns (uint256) {
        return totalMORBIUSClaimableOutstanding;
    }

    function getPlayerLifetime(address player) external view returns (
        uint256 ticketsBought,
        uint256 totalSpent,
        uint256 totalClaimed,
        uint256 totalClaimable
    ) {
        PlayerTotals storage pt = playerTotals[player];
        ticketsBought = pt.ticketsBought;
        totalSpent = pt.totalSpent;
        totalClaimed = pt.totalClaimed;
        totalClaimable = playerOutstandingClaimable[player];
    }

    function getPlayerRoundHistory(
        address player,
        uint256 start,
        uint256 count
    ) external view returns (
        uint256[] memory roundIds,
        uint256[] memory ticketsBoughtPerRound,
        uint256[] memory claimablePerRound
    ) {
        uint256 total = playerRounds[player].length;
        if (start >= total) {
            return (new uint256[](0), new uint256[](0), new uint256[](0));
        }
        uint256 end = start + count;
        if (end > total) {
            end = total;
        }
        uint256 size = end - start;
        roundIds = new uint256[](size);
        ticketsBoughtPerRound = new uint256[](size);
        claimablePerRound = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            uint256 roundId = playerRounds[player][start + i];
            roundIds[i] = roundId;
            ticketsBoughtPerRound[i] = playerTicketIds[roundId][player].length;
            claimablePerRound[i] = claimableWinnings[roundId][player];
        }
    }

    function getRoundHistoryTotals(uint256 roundId) external view returns (
        uint256 totalMORBIUS,
        uint256 totalTickets,
        uint256 winnersPoolTotal,
        uint256 burnTotal,
        uint256 megaTotal,
        uint256 totalUnclaimed
    ) {
        Round storage r = rounds[roundId];
        totalMORBIUS = r.totalMORBIUSCollected;
        totalTickets = r.totalTickets;
        winnersPoolTotal = (r.totalMORBIUSCollected * WINNERS_POOL_PCT) / TOTAL_PCT;
        burnTotal = (r.totalMORBIUSCollected * BURN_PCT) / TOTAL_PCT;
        megaTotal = (r.totalMORBIUSCollected * MEGA_BANK_PCT) / TOTAL_PCT;

        for (uint256 i = 0; i < 6; i++) {
            BracketWinners storage bw = r.brackets[i];
            uint256 paid = bw.payoutPerWinner * bw.winnerCount;
            if (bw.poolAmount > paid) {
                totalUnclaimed += (bw.poolAmount - paid);
            }
        }
    }

    // ============ Internal Functions ============

    function _processTickets(address player, uint8[6][] calldata ticketNumbers, uint256 roundId) private {
        for (uint256 i = 0; i < ticketNumbers.length; i++) {
            _validateTicket(ticketNumbers[i]);

            Ticket memory ticket = Ticket({
                player: player,
                numbers: _sortNumbers(ticketNumbers[i]),
                ticketId: nextTicketId,
                isFreeTicket: false,
                isHouseTicket: false
            });

            roundTickets[roundId].push(ticket);
            playerTicketIds[roundId][player].push(nextTicketId);
            nextTicketId++;
        }

        if (!hasEnteredRound[roundId][player]) {
            roundPlayers[roundId].push(player);
            hasEnteredRound[roundId][player] = true;
            rounds[roundId].uniquePlayers += 1;
        }

        if (!playerRoundSeen[player][roundId]) {
            playerRoundSeen[player][roundId] = true;
            playerRounds[player].push(roundId);
        }

        if (roundId == currentRoundId) {
            currentRoundTotalTickets += ticketNumbers.length;
        } else {
            pendingRoundTickets[roundId] += ticketNumbers.length;
        }
    }


    function _validateTicket(uint8[6] memory numbers) private pure {
        for (uint256 i = 0; i < NUMBERS_PER_TICKET; i++) {
            require(numbers[i] >= MIN_NUMBER && numbers[i] <= MAX_NUMBER, "Number out of range");
            for (uint256 j = i + 1; j < NUMBERS_PER_TICKET; j++) {
                require(numbers[i] != numbers[j], "Duplicate numbers");
            }
        }
    }

    function _sortNumbers(uint8[6] memory numbers) private pure returns (uint8[6] memory) {
        for (uint256 i = 0; i < NUMBERS_PER_TICKET - 1; i++) {
            for (uint256 j = 0; j < NUMBERS_PER_TICKET - 1 - i; j++) {
                if (numbers[j] > numbers[j + 1]) {
                    (numbers[j], numbers[j + 1]) = (numbers[j + 1], numbers[j]);
                }
            }
        }
        return numbers;
    }

    function _isRoundExpired() private view returns (bool) {
        return block.timestamp >= currentRoundStartTime + roundDuration;
    }

    function _startNewRound() private {
        currentRoundId++;
        currentRoundStartTime = block.timestamp;
        currentRoundState = RoundState.OPEN;
        currentRoundTotalMORBIUS = rolloverReserve + pendingRoundMORBIUS[currentRoundId];
        currentRoundTotalCollectedFromPlayers = 0; // Reset for new round
        rolloverReserve = 0;
        currentRoundTotalTickets = pendingRoundTickets[currentRoundId];
        pendingRoundMORBIUS[currentRoundId] = 0;
        pendingRoundTickets[currentRoundId] = 0;

        emit RoundStarted(currentRoundId, currentRoundStartTime, currentRoundStartTime + roundDuration);
    }

    /**
     * @notice Finalize round and draw numbers immediately
     */
    function _finalizeRound() private {
        require(currentRoundState == RoundState.OPEN, "Round not open");

        uint256 finalizingRoundId = currentRoundId;
        uint256 closingBlock = block.number;

        // Store basic round info
        rounds[finalizingRoundId].roundId = finalizingRoundId;
        rounds[finalizingRoundId].startTime = currentRoundStartTime;
        rounds[finalizingRoundId].endTime = block.timestamp;
        rounds[finalizingRoundId].closingBlock = closingBlock;
        rounds[finalizingRoundId].drawBlock = closingBlock;
        rounds[finalizingRoundId].totalMORBIUSCollected = currentRoundTotalCollectedFromPlayers;
        rounds[finalizingRoundId].totalTickets = currentRoundTotalTickets;
        rounds[finalizingRoundId].uniquePlayers = roundPlayers[finalizingRoundId].length;

        // Handle empty round or draw numbers
        if (currentRoundTotalTickets == 0) {
            _handleEmptyRound(finalizingRoundId);
        } else {
            // Generate winning numbers immediately
            uint8[6] memory winningNumbers = _generateWinningNumbers(finalizingRoundId, closingBlock);
            rounds[finalizingRoundId].winningNumbers = winningNumbers;

            emit NumbersDrawn(finalizingRoundId, winningNumbers, closingBlock);

            // Calculate brackets and distribute prizes
            _calculateBrackets(finalizingRoundId, winningNumbers);

            // Distribute MegaMORBIUS immediately to any 5/6 match winners
            if (rounds[finalizingRoundId].brackets[4].winnerCount > 0 || rounds[finalizingRoundId].brackets[5].winnerCount > 0) {
                _handleMegaMORBIUSDistribution(finalizingRoundId);
            }

            _distributePrizes(finalizingRoundId);
        }

        // Finalize the round
        rounds[finalizingRoundId].state = RoundState.FINALIZED;
        currentRoundState = RoundState.FINALIZED;

        emit RoundFinalized(finalizingRoundId, rounds[finalizingRoundId].winningNumbers, rounds[finalizingRoundId].totalMORBIUSCollected, rounds[finalizingRoundId].totalTickets, rounds[finalizingRoundId].uniquePlayers);
    }

    function _handleEmptyRound(uint256 roundId) private {
        // Round is already partially filled by _finalizeRound, just complete it
        rounds[roundId].winningNumbers = [0, 0, 0, 0, 0, 0];
        rounds[roundId].brackets = [
            BracketWinners(1, 0, 0, 0, new uint256[](0)),
            BracketWinners(2, 0, 0, 0, new uint256[](0)),
            BracketWinners(3, 0, 0, 0, new uint256[](0)),
            BracketWinners(4, 0, 0, 0, new uint256[](0)),
            BracketWinners(5, 0, 0, 0, new uint256[](0)),
            BracketWinners(6, 0, 0, 0, new uint256[](0))
        ];
        rounds[roundId].megaBankContribution = 0;

        // FIX: Roll over the entire prize pool since there are no tickets
        rolloverReserve += currentRoundTotalMORBIUS;
    }

    function _generateWinningNumbers(uint256 roundId, uint256 closingBlock) private view returns (uint8[6] memory) {
        // Use previous block hash for randomness
        uint256 prevBlock = closingBlock > 0 ? closingBlock - 1 : 0;

        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(prevBlock),
            blockhash(closingBlock),
            roundId,
            currentRoundTotalMORBIUS,
            currentRoundTotalTickets,
            block.timestamp,
            tx.origin
        )));

        uint8[6] memory numbers;
        bool[56] memory used;

        for (uint256 i = 0; i < NUMBERS_PER_TICKET; i++) {
            uint8 num;
            uint256 attempts = 0;

            do {
                seed = uint256(keccak256(abi.encodePacked(seed, i, attempts)));
                num = uint8((seed % MAX_NUMBER) + 1);
                attempts++;
            } while (used[num] && attempts < 100);

            require(!used[num], "RNG failed");
            numbers[i] = num;
            used[num] = true;
        }

        return _sortNumbers(numbers);
    }

    function _countMatches(uint8[6] memory ticket, uint8[6] memory winning) private pure returns (uint8) {
        uint8 matches = 0;
        uint256 wi = 0;

        for (uint256 ti = 0; ti < NUMBERS_PER_TICKET && wi < NUMBERS_PER_TICKET; ti++) {
            while (wi < NUMBERS_PER_TICKET && winning[wi] < ticket[ti]) {
                wi++;
            }
            if (wi < NUMBERS_PER_TICKET && winning[wi] == ticket[ti]) {
                matches++;
                wi++;
            }
        }

        return matches;
    }

    function _calculateBrackets(uint256 roundId, uint8[6] memory winningNumbers) private {
        Ticket[] storage tickets = roundTickets[roundId];

        uint256[7] memory bracketCounts;
        uint256[][7] memory bracketTicketIds;

        for (uint256 i = 1; i <= 6; i++) {
            bracketTicketIds[i] = new uint256[](tickets.length);
        }

        for (uint256 i = 0; i < tickets.length; i++) {
            uint8 matches = _countMatches(tickets[i].numbers, winningNumbers);

            if (matches > 0) {
                bracketTicketIds[matches][bracketCounts[matches]] = tickets[i].ticketId;
                bracketCounts[matches]++;
            }
        }

        for (uint256 bracket = 1; bracket <= 6; bracket++) {
            // Fixed amount per winner for this bracket
            uint256 payoutPerWinner = BRACKET_AMOUNTS[bracket - 1];
            uint256 totalBracketCost = payoutPerWinner * bracketCounts[bracket];

            if (bracketCounts[bracket] > 0) {
                uint256[] memory winningIds = new uint256[](bracketCounts[bracket]);
                for (uint256 i = 0; i < bracketCounts[bracket]; i++) {
                    winningIds[i] = bracketTicketIds[bracket][i];
                }

                rounds[roundId].brackets[bracket - 1] = BracketWinners({
                    matchCount: bracket,
                    poolAmount: totalBracketCost,
                    winnerCount: bracketCounts[bracket],
                    payoutPerWinner: payoutPerWinner,
                    winningTicketIds: winningIds
                });
            } else {
                // No winners - no unclaimed prizes to rollover since prizes are fixed amounts
                rounds[roundId].brackets[bracket - 1] = BracketWinners({
                    matchCount: bracket,
                    poolAmount: 0,
                    winnerCount: 0,
                    payoutPerWinner: 0,
                    winningTicketIds: new uint256[](0)
                });
            }

            emit BracketResults(roundId, bracket, bracketCounts[bracket], totalBracketCost, payoutPerWinner);
        }

        rounds[roundId].winningNumbers = winningNumbers;
        rounds[roundId].totalMORBIUSCollected = currentRoundTotalCollectedFromPlayers; // Full amount from players
        rounds[roundId].totalTickets = currentRoundTotalTickets;
        rounds[roundId].uniquePlayers = roundPlayers[roundId].length;
        rounds[roundId].roundId = roundId;
        rounds[roundId].startTime = currentRoundStartTime;
        rounds[roundId].endTime = block.timestamp;
        rounds[roundId].closingBlock = block.number;
    }

    function _handleUnclaimedBracket(uint256 roundId, uint256 bracket, uint256 amount) private {
        // 100% rollover - preserve all unclaimed funds for future winners
        rolloverReserve += amount;

        emit UnclaimedPrizeRolledOver(roundId, bracket, amount, "NextRoundWinnersPool-100%");
    }


    function _distributePrizes(uint256 roundId) private {
        Ticket[] storage tickets = roundTickets[roundId];

        for (uint256 bracket = 0; bracket < 6; bracket++) {
            BracketWinners storage bw = rounds[roundId].brackets[bracket];

            if (bw.winnerCount > 0) {
                for (uint256 i = 0; i < bw.winningTicketIds.length; i++) {
                    uint256 ticketId = bw.winningTicketIds[i];

                    for (uint256 j = 0; j < tickets.length; j++) {
                        if (tickets[j].ticketId == ticketId) {
                            claimableWinnings[roundId][tickets[j].player] += bw.payoutPerWinner;
                            totalMORBIUSClaimableOutstanding += bw.payoutPerWinner;
                            playerOutstandingClaimable[tickets[j].player] += bw.payoutPerWinner;
                            break;
                        }
                    }
                }
            }
        }

        // NOTE: Burn and MegaMORBIUS are now allocated at ticket purchase time, not here
        // This function only distributes prizes from the winners pool
        rounds[roundId].megaBankContribution = 0; // Tracked separately at purchase time
    }

    function _handleMegaMORBIUSDistribution(uint256 roundId) private {
        if (megaMORBIUSBank == 0) return;

        // MegaMORBIUS now only affects 5 and 6 matches (brackets 4 and 5)
        uint256 toBracket6 = (megaMORBIUSBank * 65) / 100; // 65% to 6 matches
        uint256 toBracket5 = (megaMORBIUSBank * 35) / 100; // 35% to 5 matches

        // Add MegaMORBIUS bonus to winners (each winner gets base prize + their share of MegaMORBIUS)
        if (rounds[roundId].brackets[5].winnerCount > 0) {
            uint256 megaBonusPerWinner6 = toBracket6 / rounds[roundId].brackets[5].winnerCount;
            rounds[roundId].brackets[5].payoutPerWinner += megaBonusPerWinner6;
            rounds[roundId].brackets[5].poolAmount += toBracket6;
        }

        if (rounds[roundId].brackets[4].winnerCount > 0) {
            uint256 megaBonusPerWinner5 = toBracket5 / rounds[roundId].brackets[4].winnerCount;
            rounds[roundId].brackets[4].payoutPerWinner += megaBonusPerWinner5;
            rounds[roundId].brackets[4].poolAmount += toBracket5;
        }

        emit MegaMORBIUSDistributed(roundId, megaMORBIUSBank, toBracket6, toBracket5);

        megaMORBIUSBank = 0;
    }

    // ============ Burn Accumulator ============

    function _accrueBurn(uint256 amount) private {
        if (amount == 0) return;
        MORBIUS_TOKEN.safeTransfer(BURN_ADDRESS, amount);
        emit BurnExecuted(amount);
    }


}
