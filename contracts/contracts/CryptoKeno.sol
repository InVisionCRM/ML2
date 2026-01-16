// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
                                                                                
                                       ▄▄_                                      
                                   ,▓███████▄_                                  
                               _▄███████████████▄_                              
                            ▄▓██████████████████████▄_                          
                        ,▌█████████████▌─╩██████████████▄_                      
                     ▄█████████████▓"        ▀██████████████▄                   
                 ,▓████████████▌╙               └▓█████████████▓▄               
             _▌█████████████╨         ▄▄_           ╩██████████████▓▄           
           ▓████████████▀         _▌██████▓▄            ▀██████████████         
           ██████████▌_        ▄▓█████████████▌▄           └▓██████████         
           ██████████████▄_ ▄█████████████████████▌_           ╨███████         
             └▀███████████████████████████████████████▄_           ▀███         
                 └▀█████████████████▀      ▀█████████████▓            ╙         
                     '▀█████████████▌_         ▀██████████                      
                         ╙▌█████████████▄_        └▀██████                      
                             ╙▌████████████▌▄         ╙▓██                      
                                 ╙▌████████████▄_                               
                        ▌▄           ╙▀███████████▓▄                            
                        ████▌_           ╙▌███████████▄_                        
                        ████████▄_           ╙▓██████████▓▄                     
                        ████████████▄_     ,▄████████████████▌_                 
          ╒▄             '▀████████████▓▄▌██████████████████████▓▄_             
          ▐██▓▄_             ╙▓████████████████████▀    ╙▓██████████▌▄          
          ▐██████▓▄_             ╨█████████████▀"         ,▌███████████         
          ▐██████████▌▄_            `▀██████▀          ▄▌██████████████         
          └██████████████▌▄             ╙"         ╓▄████████████████▀`         
             ╙▀█████████████▓▄▄                _▄▓███████████████▀"             
                 ╙▀█████████████▓▄_         ▄Φ███████████████▌"                 
                     ╙▀█████████████▓▄_ ,▄▓██████████████▓╙                     
                         ╙▀██████████████████████████▓▀                         
                             ╙▀██████████████████▓▀`                           
                                 ╙▀▓▓▓▓▓▓▓▓▓█▓▀"                                
                                     ╙▀▓▓▓▀"                                    

*/

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPulseXRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

interface IWrappedPulse is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

interface IRandomProvider {
    function requestRandomness(uint256 roundId) external returns (bytes32);
}

/**
 * @title Crypto Keno (Bankrolled 20-of-80 Club Keno style)
 * @notice On-chain 20-of-80 Keno with 1-10 spots, consecutive draws, multiplier and Bulls-Eye add-ons, bankrolled payout caps.
 * @dev Mirrors keno-logic.md: numbers 1..80, draw 20 unique; players choose spots, wager per draw, optional add-ons, multi-draw tickets.
 *      Progressive is removed for MVP; payouts come from per-round bankroll built from ticket net proceeds (post-fee).
 */
contract CryptoKeno is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint8 public constant NUMBERS = 80;
    uint8 public constant DRAWN = 20;
    uint8 public constant MIN_SPOT = 1;
    uint8 public constant MAX_DRAWS = 100; // Prevent unbounded round creation
    uint256 public constant MIN_WAGER = 1 * 10**18; // 1 MORBIUS minimum wager
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ============ Enums ============

    enum RoundState {
        OPEN,
        CLOSED,
        FINALIZED
    }

    // ============ Structs ============

    struct Round {
        uint256 id;
        uint64 startTime;
        uint64 endTime;
        RoundState state;
        bytes32 requestId; // Optional VRF/adapter request id
        bytes32 randomSeed; // Final randomness used for draws
        uint8[DRAWN] winningNumbers;
        uint256 totalBaseWager;
        uint256 poolBalance; // Available bankroll for this round's payouts
    }

    struct Ticket {
        address player;
        uint64 firstRoundId;
        uint8 draws; // Total draws purchased for this ticket
        uint8 spotSize;
        uint8 drawsRemaining;
        uint256 wagerPerDraw;
        uint256 numbersBitmap; // Packed set of chosen numbers (bit i represents number i+1)
    }

    // ============ State Variables ============

    IERC20 public immutable token;
    IWrappedPulse public immutable wrappedPulse;
    IPulseXRouter public immutable pulseXRouter;
    uint8 public immutable maxSpot; // Configurable upper bound, default 10
    uint256 public roundDuration; // Seconds per draw cadence
    uint256 public currentRoundId;
    uint256 public nextTicketId = 1;
    uint256 public feeBps; // Protocol fee on gross ticket cost (20%)
    address public feeRecipient; // Keeper wallet (5% of gross)
    address public deployerRecipient; // Deployer wallet (5% of gross)
    IRandomProvider public randomnessProvider; // Optional VRF/adapter
    uint256 public maxWagerPerDraw; // owner-configured cap to bound liability

    // Paytable: paytable[spot][hits] = multiplier
    mapping(uint8 => uint256[16]) public paytable; // Support up to spotSize <= 15 if desired

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public ticketsByRound; // roundId => ticketIds participating in that draw
    mapping(uint256 => mapping(uint256 => bool)) public claimed; // roundId => ticketId => claimed
    mapping(uint256 => bytes32) public committedHash; // For commit-reveal seeds
    mapping(uint256 => bytes32) public revealedSeed; // Revealed seed value (preimage)

    // Player Statistics
    mapping(address => uint256[]) public playerTickets; // player => all their ticket IDs
    mapping(address => uint256) public playerTotalWagered; // Lifetime wagered
    mapping(address => uint256) public playerTotalWon; // Lifetime winnings
    mapping(address => uint256) public playerTicketCount; // Total tickets bought
    mapping(address => uint256) public playerWinCount; // Total winning claims

    // Global Statistics
    uint256 public globalTotalWagered;
    uint256 public globalTotalWon;
    uint256 public globalTicketCount;

    // Burn accumulator
    uint256 public burnThreshold = 100_000 * 1e18; // 100k token threshold
    uint256 public pendingBurnToken;

    // Auto-claim feature
    mapping(address => bool) public autoClaimEnabled;

    // Claim deadline
    uint256 public constant CLAIM_DEADLINE = 180 days;

    // ============ Events ============

    event RoundStarted(uint256 indexed roundId, uint64 startTime, uint64 endTime);
    event TicketPurchased(
        address indexed player,
        uint256 indexed ticketId,
        uint256 indexed firstRoundId,
        uint8 draws,
        uint8 spotSize,
        uint256 wagerPerDraw,
        uint256 grossCost
    );

    // NEW ENHANCED EVENTS
    event TicketPurchasedDetailed(
        address indexed player,
        uint256 indexed ticketId,
        uint256 indexed firstRoundId,
        uint8 draws,
        uint8 spotSize,
        uint256 costInMORBIUS,
        bool paidWithPLS,
        uint8[] pickedNumbers
    );

    event PLSPurchase(
        address indexed player,
        uint256 plsAmountSpent,
        uint256 morbiusReceived,
        uint256 indexed ticketId
    );

    event TicketDrew(
        uint256 indexed ticketId,
        uint256 indexed roundId,
        uint8[] playerNumbers,
        uint8[DRAWN] winningNumbers,
        uint8 matches,
        uint256 payoutAmount,
        uint256 timestamp
    );

    event TicketWon(
        uint256 indexed ticketId,
        uint256 indexed roundId,
        uint8 matches,
        uint256 payoutAmount,
        address indexed player
    );

    event TicketExpired(
        uint256 indexed ticketId,
        address indexed player,
        uint256 finalRoundId,
        uint8 totalDrawsCompleted,
        uint256 totalWinnings
    );

    event WinningsClaimed(
        address indexed player,
        uint256[] ticketIds,
        uint256 totalAmountClaimed,
        uint256 timestamp
    );

    event RoundClosed(uint256 indexed roundId);
    event RoundRandomnessRequested(uint256 indexed roundId, bytes32 requestId);
    event RandomnessCommitted(uint256 indexed roundId, bytes32 commitment);
    event RandomnessRevealed(uint256 indexed roundId, bytes32 seed);
    event RoundFinalized(uint256 indexed roundId, uint8[DRAWN] winningNumbers);
    event PrizeClaimed(
        uint256 indexed roundId,
        uint256 indexed ticketId,
        address indexed player,
        uint256 prize,
        uint256 paidPrize
    );
    event PrizeShortfall(uint256 indexed roundId, uint256 indexed ticketId, uint256 owed, uint256 paid);
    event PaytableUpdated(uint8 spotSize, uint8 hits, uint256 multiplier);
    event FeeUpdated(uint256 feeBps, address recipient);
    event RandomnessProviderUpdated(address provider);
    event RoundDurationUpdated(uint256 newDuration);
    event MaxWagerUpdated(uint256 maxWagerPerDraw);
    event AutoClaimEnabled(address indexed player, bool enabled);
    event AutoClaimProcessed(uint256 indexed roundId, uint256 indexed ticketId, address indexed player, uint256 prize);
    event BurnExecuted(uint256 amount);
    event BurnThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ============ Errors ============

    error InvalidSpotSize();
    error InvalidNumbers();
    error RoundNotOpen();
    error RoundNotFinalized();
    error AlreadyClaimed();
    error RoundStillActive();
    error RandomnessNotReady();
    error RoundAlreadyFinalized();
    error WagerTooHigh();
    error WagerTooLow();
    error ClaimExpired();
    error TooManyDraws();

    // ============ Constructor ============

    constructor(
        address token_,
        uint8 maxSpot_,
        uint256 roundDuration_,
        uint256 feeBps_,
        address feeRecipient_,
        uint256 /* progressiveBaseSeed_ */, // kept for signature compatibility
        address wrappedPulse_,
        address pulseXRouter_
    ) Ownable(msg.sender) {
        require(token_ != address(0), "token required");
        require(feeRecipient_ != address(0), "fee recipient required");
        require(maxSpot_ >= MIN_SPOT && maxSpot_ <= 20, "maxSpot bounds");
        require(wrappedPulse_ != address(0), "wrapped PLS required");
        require(pulseXRouter_ != address(0), "router required");
        token = IERC20(token_);
        wrappedPulse = IWrappedPulse(wrappedPulse_);
        pulseXRouter = IPulseXRouter(pulseXRouter_);
        maxSpot = maxSpot_;
        roundDuration = roundDuration_; // configurable cadence
        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        deployerRecipient = msg.sender; // Deployer gets 5% of gross
        maxWagerPerDraw = 1000 * 10**18; // allow up to 1000 MORBIUS per draw

        _initDefaultPaytables();
        _startFirstRound();
    }

    // ============ Modifiers ============

    modifier onlyExistingRound(uint256 roundId) {
        require(rounds[roundId].id != 0, "round missing");
        _;
    }

    // ============ External Admin ============

    function setPaytable(uint8 spotSize, uint8 hits, uint256 multiplier_) external onlyOwner {
        require(spotSize >= MIN_SPOT && spotSize <= maxSpot, "spot out of range");
        require(hits <= spotSize, "hits out of range");
        paytable[spotSize][hits] = multiplier_;
        emit PaytableUpdated(spotSize, hits, multiplier_);
    }

    function setFee(uint256 feeBps_, address recipient) external onlyOwner {
        require(recipient != address(0), "recipient required");
        require(feeBps_ <= BPS_DENOMINATOR, "fee too high");
        feeBps = feeBps_;
        feeRecipient = recipient;
        emit FeeUpdated(feeBps_, recipient);
    }

    function setRandomnessProvider(address provider) external onlyOwner {
        randomnessProvider = IRandomProvider(provider);
        emit RandomnessProviderUpdated(provider);
    }

    function setRoundDuration(uint256 newDuration) external onlyOwner {
        roundDuration = newDuration;
        emit RoundDurationUpdated(newDuration);
    }

    function setMaxWagerPerDraw(uint256 maxWager) external onlyOwner {
        maxWagerPerDraw = maxWager;
        emit MaxWagerUpdated(maxWager);
    }

    function startNextRound() external whenNotPaused onlyOwner {
        _finalizeIfExpired(currentRoundId);

        uint256 nextRoundId = currentRoundId + 1;

        // Check if next round already exists (from multi-draw tickets)
        if (rounds[nextRoundId].id != 0) {
            // Round exists but may be uninitialized (timestamps = 0)
            // Fix the timestamps if they're not set
            if (rounds[nextRoundId].startTime == 0) {
                uint64 start = uint64(block.timestamp);
                rounds[nextRoundId].startTime = start;
                rounds[nextRoundId].endTime = uint64(block.timestamp + roundDuration);
            }
            currentRoundId = nextRoundId;
            emit RoundStarted(nextRoundId, rounds[nextRoundId].startTime, rounds[nextRoundId].endTime);
        } else {
            // Round doesn't exist, create it
            _startNewRound(nextRoundId, block.timestamp);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawBankroll(uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0), "zero address");
        token.safeTransfer(to, amount);
    }

    /**
     * @notice Reclaim unclaimed prizes from expired rounds back to contract pool
     * @param roundId Round to reclaim from
     */
    function reclaimExpiredPrizes(uint256 roundId) external onlyOwner nonReentrant onlyExistingRound(roundId) {
        Round storage roundInfo = rounds[roundId];
        require(roundInfo.state == RoundState.FINALIZED, "not finalized");
        require(block.timestamp > roundInfo.endTime + CLAIM_DEADLINE, "not expired");

        // Unclaimed prizes remain in poolBalance, nothing to do
        // This function exists for transparency and potential future enhancements
    }

    // ============ Player Actions ============

    /**
     * @notice Buy a ticket for the given round and consecutive draws.
     * @param roundId Round to start playing.
     * @param numbers Player picks (length == spotSize, unique ints in [1,80]).
     * @param spotSize Number of spots (1-10).
     * @param draws Number of consecutive draws (e.g. 1-100).
     * @param wagerPerDraw Base wager per draw.
     */
    function buyTicket(
        uint256 roundId,
        uint8[] calldata numbers,
        uint8 spotSize,
        uint8 draws,
        uint256 wagerPerDraw
    ) external whenNotPaused nonReentrant onlyExistingRound(roundId) {
        roundId = _ensureOpenRound(roundId);
        if (spotSize < MIN_SPOT || spotSize > maxSpot) revert InvalidSpotSize();
        if (draws == 0) revert InvalidNumbers();
        if (draws > MAX_DRAWS) revert TooManyDraws();
        if (wagerPerDraw < MIN_WAGER) revert WagerTooLow();
        if (maxWagerPerDraw > 0 && wagerPerDraw > maxWagerPerDraw) revert WagerTooHigh();
        _ensureFutureRounds(roundId, draws);

        uint256 numbersBitmap = _packNumbers(numbers, spotSize);

        uint256 grossPerDraw = wagerPerDraw;
        uint256 feePerDraw = (grossPerDraw * feeBps) / BPS_DENOMINATOR;
        uint256 netPerDraw = grossPerDraw - feePerDraw;
        uint256 gross = grossPerDraw * draws;
        uint256 fee = feePerDraw * draws;
        uint256 net = netPerDraw * draws;

        // Split fee: 5% keeper, 5% deployer, 10% burn (50% of fee)
        uint256 keeperFee = fee / 4; // 25% of fee = 5% of gross
        uint256 deployerFee = fee / 4; // 25% of fee = 5% of gross
        uint256 burnFee = fee / 2; // 50% of fee = 10% of gross

        // Transfer fees
        if (keeperFee > 0) token.safeTransferFrom(msg.sender, feeRecipient, keeperFee);
        if (deployerFee > 0) token.safeTransferFrom(msg.sender, deployerRecipient, deployerFee);

        // Accrue burn portion
        _accrueBurn(burnFee);

        // Transfer remaining net to contract
        token.safeTransferFrom(msg.sender, address(this), net);

        uint256 ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            player: msg.sender,
            firstRoundId: uint64(roundId),
            draws: draws,
            spotSize: spotSize,
            drawsRemaining: draws,
            wagerPerDraw: wagerPerDraw,
            numbersBitmap: numbersBitmap
        });

        // Track participation per round for claims/analytics
        for (uint256 i = 0; i < draws; i++) {
            uint256 rid = roundId + i;
            ticketsByRound[rid].push(ticketId);
            Round storage r = rounds[rid];
            r.totalBaseWager += wagerPerDraw;
            r.poolBalance += netPerDraw;
        }

        // Update player statistics
        playerTickets[msg.sender].push(ticketId);
        playerTicketCount[msg.sender]++;
        playerTotalWagered[msg.sender] += gross;

        // Update global statistics
        globalTicketCount++;
        globalTotalWagered += gross;

        emit TicketPurchased(
            msg.sender,
            ticketId,
            roundId,
            draws,
            spotSize,
            wagerPerDraw,
            gross
        );
    }

    /**
     * @notice Buy a ticket using native PLS (wraps to WPLS then swaps to the game token)
     * @dev Uses router getAmountsIn to determine required WPLS for the gross cost, refunds any excess PLS.
     */
    function buyTicketWithPLS(
        uint256 roundId,
        uint8[] calldata numbers,
        uint8 spotSize,
        uint8 draws,
        uint256 wagerPerDraw
    ) external payable whenNotPaused nonReentrant onlyExistingRound(roundId) {
        roundId = _ensureOpenRound(roundId);
        if (spotSize < MIN_SPOT || spotSize > maxSpot) revert InvalidSpotSize();
        if (draws == 0) revert InvalidNumbers();
        if (draws > MAX_DRAWS) revert TooManyDraws();
        if (wagerPerDraw < MIN_WAGER) revert WagerTooLow();
        if (maxWagerPerDraw > 0 && wagerPerDraw > maxWagerPerDraw) revert WagerTooHigh();
        _ensureFutureRounds(roundId, draws);

        uint256 numbersBitmap = _packNumbers(numbers, spotSize);

        uint256 grossPerDraw = wagerPerDraw;
        uint256 feePerDraw = (grossPerDraw * feeBps) / BPS_DENOMINATOR;
        uint256 netPerDraw = grossPerDraw - feePerDraw;
        uint256 gross = grossPerDraw * draws;
        uint256 fee = feePerDraw * draws;
        address[] memory path = new address[](2);
        path[0] = address(wrappedPulse);
        path[1] = address(token);
        uint256[] memory amountsIn = pulseXRouter.getAmountsIn(gross, path);
        uint256 basePlsCost = amountsIn[0];

        // Add 50% tax to discourage PLS payments (like lottery contract)
        uint256 taxedAmount = (basePlsCost * 15000) / 10000;

        // Add 20% buffer for slippage and fees
        uint256 wplsNeeded = (taxedAmount * 12000) / 10000;

        require(msg.value >= wplsNeeded, "Insufficient PLS");

        wrappedPulse.deposit{value: taxedAmount}(); // Deposit taxed amount
        wrappedPulse.approve(address(pulseXRouter), taxedAmount);

        uint256 tokenBefore = token.balanceOf(address(this));

        // FIX: Swap the amount we actually deposited (taxedAmount), not wplsNeeded
        pulseXRouter.swapExactTokensForTokens(
            taxedAmount,
            0, // allow any output; enforce below
            path,
            address(this),
            block.timestamp + 300
        );

        uint256 tokenReceived = token.balanceOf(address(this)) - tokenBefore;
        require(tokenReceived >= gross, "Swap underfunded");

        if (msg.value > wplsNeeded) {
            payable(msg.sender).transfer(msg.value - wplsNeeded);
        }

        // Split fee: 5% keeper, 5% deployer, 10% burn (50% of fee)
        uint256 keeperFee = fee / 4; // 25% of fee = 5% of gross
        uint256 deployerFee = fee / 4; // 25% of fee = 5% of gross
        uint256 burnFee = fee / 2; // 50% of fee = 10% of gross

        // Transfer fees from contract balance (already swapped)
        if (keeperFee > 0) token.safeTransfer(feeRecipient, keeperFee);
        if (deployerFee > 0) token.safeTransfer(deployerRecipient, deployerFee);

        // Accrue burn portion
        _accrueBurn(burnFee);

        uint256 ticketId = nextTicketId++;
        tickets[ticketId] = Ticket({
            player: msg.sender,
            firstRoundId: uint64(roundId),
            draws: draws,
            spotSize: spotSize,
            drawsRemaining: draws,
            wagerPerDraw: wagerPerDraw,
            numbersBitmap: numbersBitmap
        });

        // Track participation per round for claims/analytics
        for (uint256 i = 0; i < draws; i++) {
            uint256 rid = roundId + i;
            ticketsByRound[rid].push(ticketId);
            Round storage r = rounds[rid];
            r.totalBaseWager += wagerPerDraw;
            r.poolBalance += netPerDraw;
        }

        // Update player statistics
        playerTickets[msg.sender].push(ticketId);
        playerTicketCount[msg.sender]++;
        playerTotalWagered[msg.sender] += gross;

        // Update global statistics
        globalTicketCount++;
        globalTotalWagered += gross;

        emit TicketPurchased(
            msg.sender,
            ticketId,
            roundId,
            draws,
            spotSize,
            wagerPerDraw,
            gross
        );
    }

    // ============ Round Lifecycle ============

    function finalizeRound(uint256 roundId) external whenNotPaused nonReentrant onlyExistingRound(roundId) {
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.state == RoundState.FINALIZED) revert RoundAlreadyFinalized();
        if (block.timestamp < roundInfo.endTime) revert RoundStillActive();
        _finalizeRoundInternal(roundId, roundInfo);
    }

    function fulfillRandomness(uint256 roundId, bytes32 randomSeed) external {
        if (msg.sender != address(randomnessProvider)) revert RandomnessNotReady();
        Round storage roundInfo = rounds[roundId];
        require(roundInfo.state != RoundState.FINALIZED, "round done");
        roundInfo.randomSeed = randomSeed;
        _materializeResults(roundId);
    }

    function commitRandom(uint256 roundId, bytes32 commitment) external onlyOwner onlyExistingRound(roundId) {
        committedHash[roundId] = commitment;
        emit RandomnessCommitted(roundId, commitment);
    }

    function revealRandom(uint256 roundId, bytes32 seed) external onlyOwner onlyExistingRound(roundId) {
        require(committedHash[roundId] == keccak256(abi.encodePacked(seed)), "commit mismatch");
        revealedSeed[roundId] = seed;
        emit RandomnessRevealed(roundId, seed);
    }

    // ============ Claims ============

    function claim(uint256 roundId, uint256 ticketId) external whenNotPaused nonReentrant onlyExistingRound(roundId) {
        _processClaimInternal(roundId, ticketId, msg.sender);
    }

    // ============ Views ============

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getTicket(uint256 ticketId) external view returns (Ticket memory) {
        return tickets[ticketId];
    }

    // ============ Player Statistics Views ============

    /**
     * @notice Get comprehensive statistics for a player
     * @param player Address of the player
     * @return totalWagered Total amount wagered lifetime
     * @return totalWon Total amount won lifetime
     * @return ticketCount Total tickets purchased
     * @return winCount Total winning claims
     * @return winRateBps Win rate in basis points (10000 = 100%)
     * @return netPnL Net profit/loss (can be negative, cast to int256)
     */
    function getPlayerStats(address player)
        external
        view
        returns (
            uint256 totalWagered,
            uint256 totalWon,
            uint256 ticketCount,
            uint256 winCount,
            uint256 winRateBps,
            int256 netPnL
        )
    {
        totalWagered = playerTotalWagered[player];
        totalWon = playerTotalWon[player];
        ticketCount = playerTicketCount[player];
        winCount = playerWinCount[player];
        winRateBps = ticketCount > 0 ? (winCount * 10000) / ticketCount : 0;
        netPnL = int256(totalWon) - int256(totalWagered);
    }

    /**
     * @notice Get global statistics
     */
    function getGlobalStats()
        external
        view
        returns (
            uint256 totalWagered,
            uint256 totalWon,
            uint256 ticketCount,
            uint256 activeRoundId
        )
    {
        return (globalTotalWagered, globalTotalWon, globalTicketCount, currentRoundId);
    }

    /**
     * @notice Get all ticket IDs for a player with pagination
     * @param player Player address
     * @param offset Starting index
     * @param limit Maximum number of results
     */
    function getPlayerTickets(
        address player,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] storage allTickets = playerTickets[player];
        if (offset >= allTickets.length) {
            return new uint256[](0);
        }

        uint256 end = offset + limit;
        if (end > allTickets.length) {
            end = allTickets.length;
        }

        uint256 resultLength = end - offset;
        uint256[] memory result = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allTickets[offset + i];
        }

        return result;
    }

    /**
     * @notice Get all player tickets (use with caution for players with many tickets)
     */
    function getAllPlayerTickets(address player) external view returns (uint256[] memory) {
        return playerTickets[player];
    }

    /**
     * @notice Check if a ticket is a winner for a specific round
     * @param ticketId Ticket ID
     * @param roundId Round ID
     * @return isWinner Whether the ticket won
     * @return prize Prize amount (0 if not a winner)
     */
    function isWinningTicket(uint256 ticketId, uint256 roundId)
        external
        view
        returns (bool isWinner, uint256 prize)
    {
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.state != RoundState.FINALIZED) {
            return (false, 0);
        }

        Ticket storage ticket = tickets[ticketId];
        if (!_ticketCoversRound(ticket, roundId)) {
            return (false, 0);
        }

        uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
        prize = ticket.wagerPerDraw * paytable[ticket.spotSize][hits];
        isWinner = prize > 0;
    }

    /**
     * @notice Get unclaimed winnings for a player across all their tickets
     * @param player Player address
     * @return totalUnclaimed Total unclaimed prize amount
     */
    function getPlayerUnclaimedWinnings(address player) external view returns (uint256 totalUnclaimed) {
        uint256[] storage tickets_ = playerTickets[player];

        for (uint256 i = 0; i < tickets_.length; i++) {
            uint256 ticketId = tickets_[i];
            Ticket storage ticket = tickets[ticketId];

            // Check each round this ticket covers
            for (uint256 j = 0; j < ticket.draws; j++) {
                uint256 roundId = uint256(ticket.firstRoundId) + j;
                Round storage roundInfo = rounds[roundId];

                if (roundInfo.state == RoundState.FINALIZED && !claimed[roundId][ticketId]) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * paytable[ticket.spotSize][hits];
                    totalUnclaimed += prize;
                }
            }
        }
    }

    /**
     * @notice Get multiple rounds at once for efficient frontend loading
     */
    function getRounds(uint256[] calldata roundIds) external view returns (Round[] memory) {
        Round[] memory results = new Round[](roundIds.length);
        for (uint256 i = 0; i < roundIds.length; i++) {
            results[i] = rounds[roundIds[i]];
        }
        return results;
    }

    /**
     * @notice Get multiple tickets at once
     */
    function getTickets(uint256[] calldata ticketIds) external view returns (Ticket[] memory) {
        Ticket[] memory results = new Ticket[](ticketIds.length);
        for (uint256 i = 0; i < ticketIds.length; i++) {
            results[i] = tickets[ticketIds[i]];
        }
        return results;
    }

    // ============ Auto-Claim Feature ============

    /**
     * @notice Enable or disable auto-claim for the caller
     * @param enabled True to enable auto-claim
     */
    function setAutoClaim(bool enabled) external {
        autoClaimEnabled[msg.sender] = enabled;
        emit AutoClaimEnabled(msg.sender, enabled);
    }

    /**
     * @notice Batch claim multiple tickets at once
     * @param roundIds Array of round IDs
     * @param ticketIds Array of ticket IDs (must match roundIds length)
     */
    function claimMultiple(uint256[] calldata roundIds, uint256[] calldata ticketIds)
        external
        whenNotPaused
        nonReentrant
    {
        require(roundIds.length == ticketIds.length, "length mismatch");
        require(roundIds.length > 0, "empty arrays");

        for (uint256 i = 0; i < roundIds.length; i++) {
            _processClaimInternal(roundIds[i], ticketIds[i], msg.sender);
        }
    }

    // ============ Internal Logic ============

    function _finalizeRoundInternal(uint256 roundId, Round storage roundInfo) internal {
        if (roundInfo.state == RoundState.FINALIZED) return;
        if (roundInfo.state == RoundState.OPEN) {
            roundInfo.state = RoundState.CLOSED;
            emit RoundClosed(roundId);
        }
        if (roundInfo.randomSeed == bytes32(0)) {
            // VRF/provider path
            if (address(randomnessProvider) != address(0) && roundInfo.requestId == bytes32(0)) {
                roundInfo.requestId = randomnessProvider.requestRandomness(roundId);
                emit RoundRandomnessRequested(roundId, roundInfo.requestId);
                revert RandomnessNotReady();
            }
            // Commit-reveal path
            if (committedHash[roundId] != bytes32(0) && revealedSeed[roundId] != bytes32(0)) {
                roundInfo.randomSeed = revealedSeed[roundId];
            } else {
                // Blockhash fallback
                roundInfo.randomSeed = keccak256(
                    abi.encodePacked(blockhash(block.number - 1), roundId, roundInfo.totalBaseWager, ticketsByRound[roundId].length)
                );
            }
        }
        _materializeResults(roundId);
    }

    function _finalizeIfExpired(uint256 roundId) internal {
        Round storage r = rounds[roundId];
        if (r.id == 0 || r.state == RoundState.FINALIZED) return;
        if (block.timestamp < r.endTime) return;
        _finalizeRoundInternal(roundId, r);
    }

    function _ensureOpenRound(uint256 requestedRoundId) internal returns (uint256) {
        if (rounds[requestedRoundId].id == 0) {
            _ensureFutureRounds(requestedRoundId, 1);
        }
        _finalizeIfExpired(requestedRoundId);
        Round storage r = rounds[requestedRoundId];
        if (r.state == RoundState.OPEN && block.timestamp < r.endTime) {
            return requestedRoundId;
        }

        uint256 nextId = currentRoundId;
        if (rounds[nextId].id == 0) {
            nextId = requestedRoundId;
        }
        _finalizeIfExpired(nextId);
        if (rounds[nextId].state == RoundState.OPEN && block.timestamp < rounds[nextId].endTime) {
            return nextId;
        }
        nextId = nextId + 1;
        _startNewRound(nextId, block.timestamp);
        return nextId;
    }

    function _startFirstRound() internal {
        currentRoundId = 1;
        uint64 start = uint64(block.timestamp);
        uint64 end = uint64(block.timestamp + roundDuration);
        rounds[currentRoundId] = Round({
            id: currentRoundId,
            startTime: start,
            endTime: end,
            state: RoundState.OPEN,
            requestId: bytes32(0),
            randomSeed: bytes32(0),
            winningNumbers: _emptyWinning(),
            totalBaseWager: 0,
            poolBalance: 0
        });
        emit RoundStarted(currentRoundId, start, end);
    }

    function _ensureFutureRounds(uint256 startingRoundId, uint8 draws) internal {
        for (uint256 i = 0; i < draws; i++) {
            uint256 rid = startingRoundId + i;
            if (rounds[rid].id == 0) {
                uint256 prevEnd = rounds[rid - 1].endTime;
                uint64 start = uint64(prevEnd < block.timestamp ? block.timestamp : prevEnd);
                uint64 end = uint64(uint256(start) + roundDuration);
                rounds[rid] = Round({
                    id: rid,
                    startTime: start,
                    endTime: end,
                    state: RoundState.OPEN,
                    requestId: bytes32(0),
                    randomSeed: bytes32(0),
                    winningNumbers: _emptyWinning(),
                    totalBaseWager: 0,
                    poolBalance: 0
                });
                emit RoundStarted(rid, start, end);
            }
        }
        // DO NOT update currentRoundId here - only update it when rounds are finalized
        // This prevents the round from jumping ahead when multi-draw tickets are purchased
    }

    function _startNewRound(uint256 newRoundId, uint256 startTime) internal {
        uint64 start = uint64(startTime);
        uint64 end = uint64(startTime + roundDuration);
        rounds[newRoundId] = Round({
            id: newRoundId,
            startTime: start,
            endTime: end,
            state: RoundState.OPEN,
            requestId: bytes32(0),
            randomSeed: bytes32(0),
            winningNumbers: _emptyWinning(),
            totalBaseWager: 0,
            poolBalance: 0
        });
        currentRoundId = newRoundId;
        emit RoundStarted(newRoundId, start, end);
    }

    // ============ Burn Accumulator ============

    function _accrueBurn(uint256 amount) private {
        if (amount == 0) return;
        pendingBurnToken += amount;
        if (pendingBurnToken >= burnThreshold) {
            _flushBurn();
        }
    }

    function _flushBurn() private {
        uint256 amount = pendingBurnToken;
        if (amount == 0) return;
        pendingBurnToken = 0;
        token.safeTransfer(address(0x000000000000000000000000000000000000dEaD), amount);
        emit BurnExecuted(amount);
    }

    /**
     * @notice Manually flush the burn accumulator when threshold is met
     */
    function flushBurn() external nonReentrant {
        require(pendingBurnToken >= burnThreshold, "Below threshold");
        _flushBurn();
    }

    /**
     * @notice Update burn threshold (owner)
     */
    function updateBurnThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be > 0");
        uint256 old = burnThreshold;
        burnThreshold = newThreshold;
        emit BurnThresholdUpdated(old, newThreshold);
    }

    function _materializeResults(uint256 roundId) internal {
        Round storage roundInfo = rounds[roundId];
        require(roundInfo.randomSeed != bytes32(0), "seed missing");
        if (roundInfo.state == RoundState.FINALIZED) return;

        uint256 seed = uint256(roundInfo.randomSeed);
        uint8[DRAWN] memory winning = _drawNumbers(seed);
        roundInfo.winningNumbers = winning;

        roundInfo.state = RoundState.FINALIZED;
        emit RoundFinalized(roundId, winning);

        // Process auto-claims for eligible tickets (gas-limited)
        _processAutoClaims(roundId);
    }

    function _processAutoClaims(uint256 roundId) internal {
        uint256[] storage ticketsInRound = ticketsByRound[roundId];
        uint256 gasLimit = 200000; // Reserve gas for finalization completion

        for (uint256 i = 0; i < ticketsInRound.length && gasleft() > gasLimit; i++) {
            uint256 ticketId = ticketsInRound[i];
            Ticket storage ticket = tickets[ticketId];

            if (autoClaimEnabled[ticket.player] && !claimed[roundId][ticketId]) {
                // Silently skip if auto-claim fails (don't revert entire finalization)
                try this._safeProcessClaim(roundId, ticketId, ticket.player) {
                    // Success - event emitted in _safeProcessClaim
                } catch {
                    // Failed auto-claim, player can manually claim later
                }
            }
        }
    }

    function _safeProcessClaim(uint256 roundId, uint256 ticketId, address player) external {
        require(msg.sender == address(this), "internal only");
        _processClaimInternal(roundId, ticketId, player);
        emit AutoClaimProcessed(roundId, ticketId, player, 0);
    }

    function _processClaimInternal(uint256 roundId, uint256 ticketId, address caller) internal {
        Round storage roundInfo = rounds[roundId];
        if (roundInfo.state != RoundState.FINALIZED) revert RoundNotFinalized();

        // Check claim deadline
        if (block.timestamp > roundInfo.endTime + CLAIM_DEADLINE) revert ClaimExpired();

        Ticket storage ticket = tickets[ticketId];
        require(ticket.player == caller, "not owner");
        if (!_ticketCoversRound(ticket, roundId)) revert RoundNotFinalized();
        if (claimed[roundId][ticketId]) revert AlreadyClaimed();

        claimed[roundId][ticketId] = true;
        if (ticket.drawsRemaining > 0) {
            ticket.drawsRemaining -= 1;
        }

        uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
        uint256 prize = ticket.wagerPerDraw * paytable[ticket.spotSize][hits];
        uint256 paid = _payoutFromPool(roundInfo, ticketId, prize);

        // Update player statistics if won
        if (paid > 0) {
            playerTotalWon[ticket.player] += paid;
            playerWinCount[ticket.player]++;
            globalTotalWon += paid;
        }

        emit PrizeClaimed(roundId, ticketId, ticket.player, prize, paid);
    }

    function _drawNumbers(uint256 seed) internal pure returns (uint8[DRAWN] memory result) {
        // Partial Fisher-Yates to get 20 unique numbers from 1..80
        uint8[NUMBERS] memory pool;
        for (uint8 i = 0; i < NUMBERS; i++) {
            pool[i] = i + 1;
        }
        uint256 randomSeed = seed;
        for (uint8 i = 0; i < DRAWN; i++) {
            uint256 swapIndex = i + (uint256(keccak256(abi.encode(randomSeed, i))) % (NUMBERS - i));
            uint8 temp = pool[i];
            pool[i] = pool[swapIndex];
            pool[swapIndex] = temp;
            result[i] = pool[i];
        }
    }

    function _scoreTicket(uint256 numbersBitmap, uint8[DRAWN] memory winning) internal pure returns (uint256 hits) {
        // Score hits from the 20 winning numbers
        for (uint8 i = 0; i < DRAWN; i++) {
            uint8 n = winning[i];
            if ((numbersBitmap & (uint256(1) << (n - 1))) != 0) {
                hits++;
            }
        }
    }

    function _payoutFromPool(Round storage roundInfo, uint256 ticketId, uint256 owed) internal returns (uint256 paid) {
        if (owed == 0) return 0;
        uint256 available = roundInfo.poolBalance;
        if (available == 0) {
            emit PrizeShortfall(roundInfo.id, ticketId, owed, 0);
            return 0;
        }
        paid = owed <= available ? owed : available;
        roundInfo.poolBalance = available - paid;
        token.safeTransfer(tickets[ticketId].player, paid);
        if (paid < owed) {
            emit PrizeShortfall(roundInfo.id, ticketId, owed, paid);
        }
    }

    function _ticketCoversRound(Ticket memory ticket, uint256 roundId) internal pure returns (bool) {
        if (roundId < ticket.firstRoundId) return false;
        uint256 lastRound = uint256(ticket.firstRoundId) + ticket.draws - 1;
        return roundId <= lastRound;
    }

    function _packNumbers(uint8[] calldata numbers, uint8 spotSize) internal pure returns (uint256 bitmap) {
        if (numbers.length != spotSize) revert InvalidNumbers();
        for (uint256 i = 0; i < numbers.length; i++) {
            uint8 n = numbers[i];
            if (n == 0 || n > NUMBERS) revert InvalidNumbers();
            uint256 bit = uint256(1) << (n - 1);
            if ((bitmap & bit) != 0) revert InvalidNumbers();
            bitmap |= bit;
        }
    }

    function _emptyWinning() internal pure returns (uint8[DRAWN] memory arr) {
        for (uint8 i = 0; i < DRAWN; i++) {
            arr[i] = 0;
        }
    }

    // ============ Default Configuration ============

    function _initDefaultPaytables() internal {
        // Base paytable (spot size => hits => multiplier)
        // Based on authentic Club Keno prize structure

        // 1-SPOT GAME
        paytable[1][1] = 2;           // $2 payout

        // 2-SPOT GAME
        paytable[2][2] = 11;          // $11 payout

        // 3-SPOT GAME
        paytable[3][3] = 27;          // $27 payout
        paytable[3][2] = 2;           // $2 payout

        // 4-SPOT GAME
        paytable[4][4] = 72;          // $72 payout
        paytable[4][3] = 5;           // $5 payout
        paytable[4][2] = 1;           // $1 payout

        // 5-SPOT GAME
        paytable[5][5] = 410;         // $410 payout
        paytable[5][4] = 18;          // $18 payout
        paytable[5][3] = 2;           // $2 payout

        // 6-SPOT GAME
        paytable[6][6] = 1100;        // $1,100 payout
        paytable[6][5] = 57;          // $57 payout
        paytable[6][4] = 7;           // $7 payout
        paytable[6][3] = 1;           // $1 payout

        // 7-SPOT GAME
        paytable[7][7] = 2000;        // $2,000 payout
        paytable[7][6] = 100;         // $100 payout
        paytable[7][5] = 11;          // $11 payout
        paytable[7][4] = 5;           // $5 payout
        paytable[7][3] = 1;           // $1 payout

        // 8-SPOT GAME
        paytable[8][8] = 10000;       // $10,000 payout
        paytable[8][7] = 300;         // $300 payout
        paytable[8][6] = 50;          // $50 payout
        paytable[8][5] = 15;          // $15 payout
        paytable[8][4] = 2;           // $2 payout

        // 9-SPOT GAME
        paytable[9][9] = 25000;       // $25,000 payout
        paytable[9][8] = 2000;        // $2,000 payout
        paytable[9][7] = 100;         // $100 payout
        paytable[9][6] = 20;          // $20 payout
        paytable[9][5] = 5;           // $5 payout
        paytable[9][4] = 2;           // $2 payout

        // 10-SPOT GAME
        paytable[10][10] = 100000;    // $100,000 payout
        paytable[10][9] = 5000;       // $5,000 payout
        paytable[10][8] = 500;        // $500 payout
        paytable[10][7] = 50;         // $50 payout
        paytable[10][6] = 10;         // $10 payout
        paytable[10][5] = 2;          // $2 payout
        paytable[10][0] = 5;          // $5 consolation
    }
}
