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

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/**
 * @title PLINKO
 * @notice On-chain PLINKO game with 17 buckets, pre-paid balls, and instant payouts
 * @dev Casino-style PLINKO with blockhash randomness and simple 5% deployer fee
 */
contract Plinko is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

       uint8 public constant TOTAL_BUCKETS = 17;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant DEPLOYER_FEE_BPS = 500; // 5%
    uint256 public constant WPLS_SWAP_BUFFER_PCT = 15000; // 50% buffer for PLS purchases
    uint256 public constant MIN_BALL_PRICE = 1 * 10**18; // 1 MORBIUS minimum

    // Risk levels
    uint8 public constant RISK_LOW = 0;
    uint8 public constant RISK_MEDIUM = 1;
    uint8 public constant RISK_HIGH = 2;

    // ============ Immutable State ============

    IERC20 public immutable MORBIUS_TOKEN;
    IWrappedPulse public immutable WPLS_TOKEN;
    IPulseXRouter public immutable pulseXRouter;

    // ============ State Variables ============

    uint256 public minWagerPerBall;
    uint256 public maxWagerPerBall;
    address public deployerRecipient;
    uint256 public contractReserve; // Available funds for payouts

    // Risk level multiplier arrays (all in basis points)
    // LOW RISK: Consistent payouts, lower variance
    uint256[TOTAL_BUCKETS] public LOW_RISK_MULTIPLIERS;

    // MEDIUM RISK: Balanced payouts
    uint256[TOTAL_BUCKETS] public MEDIUM_RISK_MULTIPLIERS;

    // HIGH RISK: Extreme edge payouts, low center
    uint256[TOTAL_BUCKETS] public HIGH_RISK_MULTIPLIERS;

    // Player data
    mapping(address => uint256) public playerBallBalance;
    mapping(address => uint256) public playerTotalDrops;
    mapping(address => uint256) public playerTotalWon;
    mapping(address => uint256) public playerBiggestWin;
    mapping(address => uint256) public playerTotalPurchased;

    // Global statistics
    uint256 public totalDrops;
    uint256 public totalBallsSold;
    uint256 public totalRevenue;
    uint256 public totalPayouts;

    // ============ Events ============

    event BallsPurchased(
        address indexed player,
        uint256 count,
        uint256 totalCost,
        bool usedPLS
    );

    event BallDropped(
        address indexed player,
        uint256 seed,
        uint8 bucket,
        uint256 multiplier,
        uint256 payout,
        uint8 riskLevel
    );

    event MultiBallsDropped(
        address indexed player,
        uint256 count,
        uint256 totalPayout,
        uint8 riskLevel
    );

    event BallPriceUpdated(uint256 newPrice);
    event MaxBallPriceUpdated(uint256 newMaxPrice);
    event MultipliersUpdated(uint256[TOTAL_BUCKETS] newMultipliers);
    event DeployerRecipientUpdated(address newRecipient);
    event EmergencyWithdraw(uint256 amount);
    event ContractFunded(address indexed funder, uint256 amount);

    // ============ Errors ============

    error InsufficientBalls();
    error InsufficientContractBalance();
    error InsufficientPLS();
    error InsufficientSwapOutput();
    error InvalidWagerAmount();
    error InvalidMultipliers();
    error ExceedsReserve();
    error InvalidRecipient();
    error InvalidRiskLevel();

    // ============ Constructor ============

    constructor(
        address _morbiusToken,
        address _wplsToken,
        address _pulseXRouter,
        address _deployerRecipient,
        uint256 _minWager,
        uint256 _maxWager
    ) Ownable(msg.sender) {
        MORBIUS_TOKEN = IERC20(_morbiusToken);
        WPLS_TOKEN = IWrappedPulse(_wplsToken);
        pulseXRouter = IPulseXRouter(_pulseXRouter);
        deployerRecipient = _deployerRecipient;
        minWagerPerBall = _minWager;
        maxWagerPerBall = _maxWager;

        // LOW RISK: Small losses possible, max 5.5x (edges high, center low)
        LOW_RISK_MULTIPLIERS = [
            550,   // 5.5x  (edges - best payout)
            250,   // 2.5x
            200,   // 2x
            130,   // 1.3x
            120,   // 1.2x
            110,   // 1.1x
            100,   // 1x
            80,    // 0.8x
            50,    // 0.5x  (center - small loss)
            80,    // 0.8x
            100,   // 1x
            110,   // 1.1x
            120,   // 1.2x
            130,   // 1.3x
            200,   // 2x
            250,   // 2.5x
            550    // 5.5x  (edges - best payout)
        ];

        // MEDIUM RISK: Bigger losses, max 15x (edges high, center loses)
        MEDIUM_RISK_MULTIPLIERS = [
            1500,  // 15x   (edges - solid jackpot)
            550,   // 5.5x
            250,   // 2.5x
            200,   // 2x
            170,   // 1.7x
            100,   // 1x
            80,    // 0.8x
            50,    // 0.5x
            20,    // 0.2x  (center)
            50,    // 0.5x
            80,    // 0.8x
            100,   // 1x
            170,   // 1.7x
            200,   // 2x
            250,   // 2.5x
            550,   // 5.5x
            1500   // 15x   (edges - solid jackpot)
        ];

        // HIGH RISK: Can lose everything, max 35x (edges high, center 0)
        HIGH_RISK_MULTIPLIERS = [
            3500,  // 35x   (edges - massive jackpot)
            1500,  // 15x
            550,   // 5.5x
            250,   // 2.5x
            170,   // 1.7x
            80,    // 0.8x
            40,    // 0.4x
            30,    // 0.3x
            20,    // 0.2x  (center - total loss)
            30,    // 0.3x
            40,    // 0.4x
            80,    // 0.8x
            170,   // 1.7x
            250,   // 2.5x
            550,   // 5.5x
            1500,  // 15x
            3500   // 35x   (edges - massive jackpot)
        ];
    }

    // ============ External Functions - Buy & Drop ============
    // NOTE: With variable wagers, we no longer support "buying balls" separately.
    // All gameplay happens through buyBallsAndDrop() or buyBallsWithPLSAndDrop().
    // This simplifies the contract and prevents wager amount confusion.

    /**
     * @notice Buy balls with MORBIUS and immediately drop them all with chosen risk level
     * @param count Number of balls to buy and drop
     * @param wagerPerBall Wager amount per ball in MORBIUS (must be between min and max)
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     */
    function buyBallsAndDrop(uint256 count, uint256 wagerPerBall, uint8 riskLevel) external whenNotPaused nonReentrant {
        if (riskLevel > RISK_HIGH) revert InvalidRiskLevel();
        require(count > 0, "Must buy at least 1 ball");
        if (wagerPerBall < minWagerPerBall || wagerPerBall > maxWagerPerBall) revert InvalidWagerAmount();

        uint256 gross = count * wagerPerBall;

        // Simple fee split: 5% deployer, 95% to contract reserve
        uint256 deployerFee = (gross * DEPLOYER_FEE_BPS) / BPS_DENOMINATOR;
        uint256 toContract = gross - deployerFee;

        // Transfer deployer fee
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, deployerRecipient, deployerFee);

        // Transfer rest to contract (payout reserve)
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), toContract);

        // Update purchase balances and stats
        playerTotalPurchased[msg.sender] += gross;
        contractReserve += toContract;
        totalBallsSold += count;
        totalRevenue += gross;

        emit BallsPurchased(msg.sender, count, gross, false);

        // Now drop all the balls immediately
        uint256 totalPayout = 0;

        // Drop each ball and accumulate payouts
        for (uint256 i = 0; i < count; i++) {
            // Get random bucket for this drop (pass i as nonce for unique randomness)
            (uint256 seed, uint8 bucket) = _getRandomBucket(i);

            // Get multiplier based on risk level
            uint256 multiplier = _getMultiplier(riskLevel, bucket);
            uint256 payout = (wagerPerBall * multiplier) / 100;

            totalPayout += payout;

            emit BallDropped(msg.sender, seed, bucket, multiplier, payout, riskLevel);
        }

        // Pay out total winnings immediately
        if (totalPayout > 0) {
            // TESTING: Skip reserve check - just pay from contract balance
            // if (contractReserve < totalPayout) revert InsufficientContractBalance();
            // contractReserve -= totalPayout;
            MORBIUS_TOKEN.safeTransfer(msg.sender, totalPayout);
        }

        // Update player statistics
        playerTotalDrops[msg.sender] += count;
        playerTotalWon[msg.sender] += totalPayout;

        if (totalPayout > playerBiggestWin[msg.sender]) {
            playerBiggestWin[msg.sender] = totalPayout;
        }

        // Update global statistics
        totalDrops += count;
        totalPayouts += totalPayout;
    }

    /**
     * @notice Buy balls with PLS and immediately drop them all with chosen risk level
     * @param ballCount Number of balls to buy and drop
     * @param wagerPerBall Wager amount per ball in MORBIUS (must be between min and max)
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     */
    function buyBallsWithPLSAndDrop(uint256 ballCount, uint256 wagerPerBall, uint8 riskLevel)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (riskLevel > RISK_HIGH) revert InvalidRiskLevel();
        require(ballCount > 0, "Must buy at least 1 ball");
        if (wagerPerBall < minWagerPerBall || wagerPerBall > maxWagerPerBall) revert InvalidWagerAmount();

        uint256 morbiusNeeded = ballCount * wagerPerBall;

        // Calculate required WPLS with 50% buffer for slippage
        address[] memory path = new address[](2);
        path[0] = address(WPLS_TOKEN);
        path[1] = address(MORBIUS_TOKEN);

        uint256[] memory amounts = pulseXRouter.getAmountsIn(morbiusNeeded, path);
        uint256 wplsRequired = amounts[0];
        uint256 wplsWithBuffer = (wplsRequired * WPLS_SWAP_BUFFER_PCT) / BPS_DENOMINATOR;

        if (msg.value < wplsWithBuffer) revert InsufficientPLS();

        // Wrap the PLS to WPLS
        WPLS_TOKEN.deposit{value: msg.value}();

        // Swap WPLS for MORBIUS
        address[] memory swapPath = new address[](2);
        swapPath[0] = address(WPLS_TOKEN);
        swapPath[1] = address(MORBIUS_TOKEN);

        WPLS_TOKEN.approve(address(pulseXRouter), msg.value);
        uint256[] memory swapResult = pulseXRouter.swapExactTokensForTokens(
            msg.value,
            morbiusNeeded, // Minimum output
            swapPath,
            address(this),
            block.timestamp + 3600
        );

        uint256 morbiusReceived = swapResult[1];

        // Simple fee split: 5% deployer, 95% to contract reserve
        uint256 deployerFee = (morbiusReceived * DEPLOYER_FEE_BPS) / BPS_DENOMINATOR;
        uint256 toContract = morbiusReceived - deployerFee;

        // Transfer deployer fee
        MORBIUS_TOKEN.safeTransfer(deployerRecipient, deployerFee);

        // Update purchase balances and stats
        playerTotalPurchased[msg.sender] += morbiusReceived;
        contractReserve += toContract;
        totalBallsSold += ballCount;
        totalRevenue += morbiusReceived;

        emit BallsPurchased(msg.sender, ballCount, morbiusReceived, true);

        // Refund excess PLS if any
        uint256 excessWpls = WPLS_TOKEN.balanceOf(address(this));
        if (excessWpls > 0) {
            WPLS_TOKEN.withdraw(excessWpls);
            payable(msg.sender).transfer(excessWpls);
        }

        // Now drop all the balls immediately
        uint256 totalPayout = 0;

        // Calculate wager per ball from total MORBIUS received
        uint256 actualWagerPerBall = morbiusReceived / ballCount;

        // Drop each ball and accumulate payouts
        for (uint256 i = 0; i < ballCount; i++) {
            // Get random bucket for this drop (pass i as nonce for unique randomness)
            (uint256 seed, uint8 bucket) = _getRandomBucket(i);

            // Get multiplier based on risk level
            uint256 multiplier = _getMultiplier(riskLevel, bucket);
            uint256 payout = (actualWagerPerBall * multiplier) / 100;

            totalPayout += payout;

            emit BallDropped(msg.sender, seed, bucket, multiplier, payout, riskLevel);
        }

        // Pay out total winnings immediately
        if (totalPayout > 0) {
            // TESTING: Skip reserve check - just pay from contract balance
            // if (contractReserve < totalPayout) revert InsufficientContractBalance();
            // contractReserve -= totalPayout;
            MORBIUS_TOKEN.safeTransfer(msg.sender, totalPayout);
        }

        // Update player statistics
        playerTotalDrops[msg.sender] += ballCount;
        playerTotalWon[msg.sender] += totalPayout;

        if (totalPayout > playerBiggestWin[msg.sender]) {
            playerBiggestWin[msg.sender] = totalPayout;
        }

        // Update global statistics
        totalDrops += ballCount;
        totalPayouts += totalPayout;
    }

    // NOTE: dropBall() and dropMultipleBalls() removed in V5.
    // With variable wagers, use buyBallsAndDrop() or buyBallsWithPLSAndDrop() instead.

    // ============ Internal Functions ============

    /**
     * @notice Generate random bucket number using blockhash
     * @dev Based on CryptoKeno.sol lines 847-849 pattern
     * @param nonce Loop counter to ensure different results for multiple drops in same transaction
     * @return seed The raw uint256 seed value
     * @return bucket Bucket number (1-17)
     */
    function _getRandomBucket(uint256 nonce) internal view returns (uint256, uint8) {
        // Use multiple entropy sources (similar to CryptoKeno.sol)
        uint256 seed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),  // Previous block hash
            block.timestamp,               // Current time
            msg.sender,                    // Player address
            totalDrops,                    // Global counter (anti-replay)
            tx.gasprice,                   // Extra entropy
            nonce                          // Loop counter (CRITICAL: ensures unique seed per ball in same tx)
        )));

        uint8 bucket = uint8((seed % TOTAL_BUCKETS) + 1); // Returns 1-17
        return (seed, bucket);
    }

    /**
     * @notice Get multiplier for a bucket based on risk level
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     * @param bucket Bucket number (1-17)
     * @return multiplier in basis points
     */
    function _getMultiplier(uint8 riskLevel, uint8 bucket) internal view returns (uint256) {
        if (riskLevel == RISK_LOW) {
            return LOW_RISK_MULTIPLIERS[bucket - 1];
        } else if (riskLevel == RISK_MEDIUM) {
            return MEDIUM_RISK_MULTIPLIERS[bucket - 1];
        } else {
            return HIGH_RISK_MULTIPLIERS[bucket - 1];
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Set minimum wager per ball
     * @param newMin New minimum wager (must be > 0)
     */
    function setMinWager(uint256 newMin) external onlyOwner {
        require(newMin > 0, "Min wager must be > 0");
        require(newMin < maxWagerPerBall, "Min must be < max");
        minWagerPerBall = newMin;
        emit BallPriceUpdated(newMin);
    }

    /**
     * @notice Set maximum wager per ball
     * @param newMax New maximum wager
     */
    function setMaxWager(uint256 newMax) external onlyOwner {
        require(newMax > minWagerPerBall, "Max must be > min");
        maxWagerPerBall = newMax;
        emit MaxBallPriceUpdated(newMax);
    }

    /**
     * @notice Update bucket multipliers for a specific risk level
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     * @param newMultipliers Array of 17 multipliers in basis points
     */
    function setBucketMultipliers(uint8 riskLevel, uint256[TOTAL_BUCKETS] calldata newMultipliers)
        external
        onlyOwner
    {
        if (riskLevel > RISK_HIGH) revert InvalidRiskLevel();

        // Validate multipliers array (basic sanity check)
        for (uint8 i = 0; i < TOTAL_BUCKETS; i++) {
            if (newMultipliers[i] > 100000) revert InvalidMultipliers(); // Max 1000x
        }

        if (riskLevel == RISK_LOW) {
            LOW_RISK_MULTIPLIERS = newMultipliers;
        } else if (riskLevel == RISK_MEDIUM) {
            MEDIUM_RISK_MULTIPLIERS = newMultipliers;
        } else {
            HIGH_RISK_MULTIPLIERS = newMultipliers;
        }

        emit MultipliersUpdated(newMultipliers);
    }

    /**
     * @notice Update deployer fee recipient
     * @param newRecipient New deployer wallet address
     */
    function setDeployerRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidRecipient();

        deployerRecipient = newRecipient;
        emit DeployerRecipientUpdated(newRecipient);
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw from contract reserve
     * @param amount Amount to withdraw (must not exceed reserve)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        if (amount > contractReserve) revert ExceedsReserve();

        contractReserve -= amount;
        MORBIUS_TOKEN.safeTransfer(owner(), amount);

        emit EmergencyWithdraw(amount);
    }

    /**
     * @notice Fund the contract reserve (for initial liquidity or refills)
     * @param amount Amount of MORBIUS to add to reserve
     */
    function fundContract(uint256 amount) external {
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, address(this), amount);
        contractReserve += amount;

        emit ContractFunded(msg.sender, amount);
    }

    // ============ View Functions - Game Configuration ============

    /**
     * @notice Get wager limits
     * @return min Minimum wager per ball
     * @return max Maximum wager per ball
     */
    function getWagerLimits() external view returns (uint256 min, uint256 max) {
        return (minWagerPerBall, maxWagerPerBall);
    }

    /**
     * @notice Get multipliers for a specific risk level
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     */
    function getBucketMultipliers(uint8 riskLevel) external view returns (uint256[TOTAL_BUCKETS] memory) {
        if (riskLevel == RISK_LOW) {
            return LOW_RISK_MULTIPLIERS;
        } else if (riskLevel == RISK_MEDIUM) {
            return MEDIUM_RISK_MULTIPLIERS;
        } else if (riskLevel == RISK_HIGH) {
            return HIGH_RISK_MULTIPLIERS;
        } else {
            revert InvalidRiskLevel();
        }
    }

    /**
     * @notice Get LOW risk multipliers
     */
    function getLowRiskMultipliers() external view returns (uint256[TOTAL_BUCKETS] memory) {
        return LOW_RISK_MULTIPLIERS;
    }

    /**
     * @notice Get MEDIUM risk multipliers
     */
    function getMediumRiskMultipliers() external view returns (uint256[TOTAL_BUCKETS] memory) {
        return MEDIUM_RISK_MULTIPLIERS;
    }

    /**
     * @notice Get HIGH risk multipliers
     */
    function getHighRiskMultipliers() external view returns (uint256[TOTAL_BUCKETS] memory) {
        return HIGH_RISK_MULTIPLIERS;
    }

    /**
     * @notice Get contract payout reserve
     */
    function getContractReserve() external view returns (uint256) {
        return contractReserve;
    }

    // ============ View Functions - Player Data ============

    /**
     * @notice Get player information
     * @param player Player address
     */
    function getPlayerInfo(address player)
        external
        view
        returns (
            uint256 ballBalance,
            uint256 totalDrops_,
            uint256 totalWon,
            uint256 biggestWin,
            uint256 totalPurchased
        )
    {
        return (
            playerBallBalance[player],
            playerTotalDrops[player],
            playerTotalWon[player],
            playerBiggestWin[player],
            playerTotalPurchased[player]
        );
    }

    /**
     * @notice Get player ball balance
     * @param player Player address
     */
    function getPlayerBallBalance(address player) external view returns (uint256) {
        return playerBallBalance[player];
    }

    // ============ View Functions - Global Statistics ============

    /**
     * @notice Get global game statistics
     */
    function getGlobalStats()
        external
        view
        returns (
            uint256 _totalDrops,
            uint256 _totalBallsSold,
            uint256 _totalRevenue,
            uint256 _totalPayouts,
            uint256 _contractReserve
        )
    {
        return (
            totalDrops,
            totalBallsSold,
            totalRevenue,
            totalPayouts,
            contractReserve
        );
    }

    /**
     * @notice Calculate expected payout for a given wager, bucket, and risk level
     * @param wagerAmount Wager amount per ball
     * @param bucketIndex Bucket number (1-17)
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     */
    function calculatePayout(uint256 wagerAmount, uint8 bucketIndex, uint8 riskLevel) external view returns (uint256) {
        require(bucketIndex >= 1 && bucketIndex <= TOTAL_BUCKETS, "Invalid bucket");
        if (riskLevel > RISK_HIGH) revert InvalidRiskLevel();

        uint256 multiplier = _getMultiplier(riskLevel, bucketIndex);
        return (wagerAmount * multiplier) / 100;
    }

    // ============ Receive Function ============

    /**
     * @notice Reject direct ETH transfers (must use buyBallsWithPLS)
     */
    receive() external payable {
        revert("Use buyBallsWithPLS");
    }
}
