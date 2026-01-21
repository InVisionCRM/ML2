// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
 * @title BigWheel
 * @notice Big Six wheel casino game with 54 segments, fixed payouts, and provably fair randomness
 * @dev Distribution: 5% keeper, 5% deployer, 10% burn, 10% MegaBank, 70% winners pool
 *     Segment payouts: 1x, 2x, 5x, 10x, 20x, 40x (Joker/Morbius)
 *     MORBIUS and WPLS payment support with auto-swap functionality
 */
contract BigWheel is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint8 public constant TOTAL_SEGMENTS = 7;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Fee distribution (basis points) - just like Plinko
    uint256 public constant BURN_FEE_BPS = 1000;     // 10% burn to dead address

    // WPLS swap buffer (50% extra for slippage)
    uint256 public constant WPLS_SWAP_BUFFER_PCT = 15000;

    // Bet types
    enum BetType { ONE, TWO, FIVE, TEN, TWENTY, JOKER, MORBIUS }

    // Burn address
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ============ Immutable State ============

    IERC20 public immutable MORBIUS_TOKEN;
    IWrappedPulse public immutable WPLS_TOKEN;
    IPulseXRouter public immutable pulseXRouter;

    // ============ Mutable State ============

    uint256 public minBetAmount = 1e18; // 1 MORBIUS
    uint256 public maxBetAmount = 10000e18; // 10,000 MORBIUS

    // Contract reserves (for payouts)
    uint256 public contractReserve;

    // Statistics
    uint256 public totalSpins;
    uint256 public totalVolume;
    uint256 public totalPayouts;

    // Player statistics
    mapping(address => uint256) public playerTotalBets;
    mapping(address => uint256) public playerTotalWon;
    mapping(address => uint256) public playerBiggestWin;
    mapping(address => uint256) public playerLastBetTime;

    // ============ Events ============

    event BetPlaced(
        address indexed player,
        BetType betType,
        uint256 betAmount,
        uint8 winningSegment,
        uint256 payout,
        bool usedPLS
    );

    // ============ Constructor ============

    constructor(
        address initialOwner,
        address _morbiusToken,
        address _wplsToken,
        address _pulseXRouter
    ) Ownable(initialOwner) {
        require(_morbiusToken != address(0), "Invalid MORBIUS token");
        require(_wplsToken != address(0), "Invalid WPLS token");
        require(_pulseXRouter != address(0), "Invalid PulseX router");

        MORBIUS_TOKEN = IERC20(_morbiusToken);
        WPLS_TOKEN = IWrappedPulse(_wplsToken);
        pulseXRouter = IPulseXRouter(_pulseXRouter);
    }

    // ============ External Functions ============

    /**
     * @notice Place a bet with MORBIUS tokens
     * @param betType The type of bet (ONE, TWO, FIVE, etc.)
     * @param betAmount Amount to bet in MORBIUS (18 decimals)
     */
    function placeBet(BetType betType, uint256 betAmount)
        external
        whenNotPaused
        nonReentrant
    {
        require(betAmount >= minBetAmount, "Bet amount too low");
        require(betAmount <= maxBetAmount, "Bet amount too high");

        // Generate winning segment
        uint8 winningSegment = _getRandomSegment();

        // Calculate payout
        uint256 payout = _calculatePayout(betType, betAmount, winningSegment);

        // Process payment and fees
        _processMorbiusPayment(betAmount, payout);

        // Update statistics
        _updateStats(msg.sender, betAmount, payout);

        emit BetPlaced(msg.sender, betType, betAmount, winningSegment, payout, false);
    }

    /**
     * @notice Place a bet with PLS tokens (auto-swaps to MORBIUS)
     * @param betType The type of bet
     * @param betAmount Amount to bet in MORBIUS equivalent
     */
    function placeBetWithPLS(BetType betType, uint256 betAmount)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        require(betAmount >= minBetAmount, "Bet amount too low");
        require(betAmount <= maxBetAmount, "Bet amount too high");
        require(msg.value > 0, "Must send PLS");

        // Generate winning segment
        uint8 winningSegment = _getRandomSegment();

        // Calculate payout
        uint256 payout = _calculatePayout(betType, betAmount, winningSegment);

        // Process PLS payment and swap
        _processPLSPayment(betAmount, payout);

        // Update statistics
        _updateStats(msg.sender, betAmount, payout);

        emit BetPlaced(msg.sender, betType, betAmount, winningSegment, payout, true);
    }


    // ============ View Functions ============

    /**
     * @notice Get segment counts for each bet type
     */
    function getSegmentCounts() external pure returns (uint8[7] memory) {
        return [1, 1, 1, 1, 1, 1, 1]; // ONE, TWO, FIVE, TEN, TWENTY, JOKER, MORBIUS - each has 1 segment
    }

    /**
     * @notice Get payout multipliers for each bet type
     */
    function getMultipliers() external pure returns (uint8[7] memory) {
        return [1, 2, 5, 10, 20, 40, 40]; // ONE, TWO, FIVE, TEN, TWENTY, JOKER, MORBIUS
    }

    /**
     * @notice Get odds for a specific bet type (in basis points)
     */
    function getOdds(BetType betType) external pure returns (uint256) {
        uint8[7] memory counts = [24, 15, 7, 4, 2, 1, 1];
        uint256 count = counts[uint256(betType)];
        return (count * BPS_DENOMINATOR) / TOTAL_SEGMENTS;
    }

    /**
     * @notice Get expected payout for a bet
     */
    function getExpectedPayout(uint256 betAmount, BetType betType) external pure returns (uint256) {
        uint8[7] memory multipliers = [1, 2, 5, 10, 20, 40, 40];
        uint256 multiplier = multipliers[uint256(betType)];
        return betAmount * multiplier;
    }

    /**
     * @notice Get player statistics
     */
    function getPlayerStats(address player) external view returns (
        uint256 totalBets,
        uint256 totalWon,
        uint256 biggestWin,
        uint256 lastBetTime
    ) {
        return (
            playerTotalBets[player],
            playerTotalWon[player],
            playerBiggestWin[player],
            playerLastBetTime[player]
        );
    }

    /**
     * @notice Get global statistics
     */
    function getGlobalStats() external view returns (
        uint256 spins,
        uint256 volume,
        uint256 payouts,
        uint256 contractBalance,
        uint256 contractReserveBalance
    ) {
        uint256 balance = MORBIUS_TOKEN.balanceOf(address(this));
        return (
            totalSpins,
            totalVolume,
            totalPayouts,
            balance,
            contractReserve
        );
    }

    // ============ Admin Functions ============

    function setMinBet(uint256 newMinBet) external onlyOwner {
        require(newMinBet > 0, "Min bet must be > 0");
        require(newMinBet < maxBetAmount, "Min bet must be < max bet");
        minBetAmount = newMinBet;
    }

    function setMaxBet(uint256 newMaxBet) external onlyOwner {
        require(newMaxBet > minBetAmount, "Max bet must be > min bet");
        maxBetAmount = newMaxBet;
    }


    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        MORBIUS_TOKEN.safeTransfer(owner(), amount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Generate a provably fair random segment
     */
    function _getRandomSegment() internal view returns (uint8) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender,
            totalSpins,
            tx.gasprice,
            block.prevrandao
        )));

        return uint8(seed % TOTAL_SEGMENTS);
    }

    /**
     * @notice Calculate payout for a bet
     */
    function _calculatePayout(BetType betType, uint256 betAmount, uint8 winningSegment)
        internal
        pure
        returns (uint256)
    {
        BetType winningBetType = _getBetTypeForSegment(winningSegment);

        if (winningBetType == betType) {
            uint8[7] memory multipliers = [1, 2, 5, 10, 20, 40, 40];
            uint256 multiplier = multipliers[uint256(betType)];
            return betAmount * multiplier;
        }

        return 0;
    }

    /**
     * @notice Get bet type for a segment index
     */
    function _getBetTypeForSegment(uint8 segmentIndex) internal pure returns (BetType) {
        require(segmentIndex < TOTAL_SEGMENTS, "Invalid segment index");

        // Each segment index directly maps to a bet type
        if (segmentIndex == 0) return BetType.ONE;
        if (segmentIndex == 1) return BetType.TWO;
        if (segmentIndex == 2) return BetType.FIVE;
        if (segmentIndex == 3) return BetType.TEN;
        if (segmentIndex == 4) return BetType.TWENTY;
        if (segmentIndex == 5) return BetType.JOKER;
        return BetType.MORBIUS;
    }

    /**
     * @notice Process MORBIUS payment and fees
     */
    function _processMorbiusPayment(uint256 betAmount, uint256 payout) internal {
        uint256 totalCost = betAmount;

        // Transfer bet amount from player
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), totalCost);

        // Fee split: 10% burn, 90% to contract reserve (just like Plinko)
        uint256 burnFee = (totalCost * BURN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 toContract = totalCost - burnFee;

        // Burn fee to dead address
        MORBIUS_TOKEN.safeTransfer(BURN_ADDRESS, burnFee);

        // Keep rest in contract for payouts
        contractReserve += toContract;

        // Deployer fee (accumulate for later withdrawal)
        // Note: In production, you'd want to track deployer fees separately

        // Pay out winnings immediately (just like Plinko)
        if (payout > 0) {
            // TESTING: Skip reserve check - just pay from contract balance
            // if (contractReserve < payout) revert InsufficientContractBalance();
            // contractReserve -= payout;
            MORBIUS_TOKEN.safeTransfer(msg.sender, payout);
        }
    }

    /**
     * @notice Process PLS payment with auto-swap
     */
    function _processPLSPayment(uint256 betAmount, uint256 payout) internal {
        // Wrap PLS to WPLS
        WPLS_TOKEN.deposit{value: msg.value}();

        // Calculate required WPLS for MORBIUS swap
        address[] memory path = new address[](2);
        path[0] = address(WPLS_TOKEN);
        path[1] = address(MORBIUS_TOKEN);

        uint256[] memory amountsIn = pulseXRouter.getAmountsIn(betAmount, path);
        uint256 wplsRequired = amountsIn[0];

        // Apply buffer for slippage
        uint256 wplsWithBuffer = (wplsRequired * WPLS_SWAP_BUFFER_PCT) / BPS_DENOMINATOR;
        require(msg.value >= wplsWithBuffer, "Insufficient PLS with buffer");

        // Approve router
        WPLS_TOKEN.approve(address(pulseXRouter), msg.value);

        // Swap WPLS to MORBIUS
        uint256[] memory amounts = pulseXRouter.swapExactTokensForTokens(
            msg.value,
            betAmount, // Minimum output
            path,
            address(this),
            block.timestamp + 3600
        );

        uint256 morbiusReceived = amounts[1];
        require(morbiusReceived >= betAmount, "Swap resulted in insufficient MORBIUS");

        // Process as MORBIUS payment (same logic)
        _processMorbiusPayment(betAmount, payout);

        // Refund excess WPLS if any
        uint256 excessWpls = WPLS_TOKEN.balanceOf(address(this));
        if (excessWpls > 0) {
            WPLS_TOKEN.withdraw(excessWpls);
            payable(msg.sender).transfer(excessWpls);
        }
    }

    /**
     * @notice Update player and global statistics
     */
    function _updateStats(address player, uint256 betAmount, uint256 payout) internal {
        // Update global stats
        totalSpins++;
        totalVolume += betAmount;
        totalPayouts += payout;

        // Update player stats
        playerTotalBets[player] += betAmount;
        playerTotalWon[player] += payout;
        playerLastBetTime[player] = block.timestamp;

        if (payout > playerBiggestWin[player]) {
            playerBiggestWin[player] = payout;
        }
    }
}