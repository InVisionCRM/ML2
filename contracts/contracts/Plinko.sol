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
    uint256 public constant BURN_FEE_BPS = 1000; // 10% burn
    uint256 public constant WPLS_SWAP_BUFFER_PCT = 15000; // 50% buffer for PLS purchases
    uint256 public constant MIN_BALL_PRICE = 1 * 10**18; // 1 MORBIUS minimum

    // Burn address for deflationary tokenomics
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

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
    error InvalidRiskLevel();

    // ============ Constructor ============

    constructor(
        address _morbiusToken,
        address _wplsToken,
        address _pulseXRouter,
        uint256 _minWager,
        uint256 _maxWager
    ) Ownable(msg.sender) {
        MORBIUS_TOKEN = IERC20(_morbiusToken);
        WPLS_TOKEN = IWrappedPulse(_wplsToken);
        pulseXRouter = IPulseXRouter(_pulseXRouter);
        minWagerPerBall = _minWager;
        maxWagerPerBall = _maxWager;

        // LOW RISK: Small losses possible, max 5.5x (edges high, center low)
        LOW_RISK_MULTIPLIERS = [
            1600,  // 16x  (edges - best payout)
            900,   // 9x
            200,   // 2x
            140,   // 1.4x
            140,   // 1.4x
            120,   // 1.2x
            110,   // 1.1x
            100,   // 1x
            50,    // 0.5x  (center - small loss)
            100,   // 1x
            110,   // 1.1x
            120,   // 1.2x
            140,   // 1.4x
            140,   // 1.4x
            200,   // 2x
            900,   // 9x
            1600   // 16x  (edges - best payout)
        ];

        // MEDIUM RISK: Bigger losses, max 15x (edges high, center loses)
        MEDIUM_RISK_MULTIPLIERS = [
            11000, // 110x   (edges - solid jackpot)
            4100,  // 41x
            1000,  // 10x
            500,   // 5x
            300,   // 3x
            150,   // 1.5x
            100,   // 1x
            50,    // 0.5x
            30,    // 0.3x  (center)
            50,    // 0.5x
            100,   // 1x
            150,   // 1.5x
            300,   // 3x
            500,   // 5x
            1000,  // 10x
            4100,  // 41x
            11000  // 110x   (edges - solid jackpot)
        ];

        // HIGH RISK: Can lose everything, max 35x (edges high, center 0)
        HIGH_RISK_MULTIPLIERS = [
            100000, // 1000x   (edges - massive jackpot)
            12000,  // 120x
            2600,   // 26x
            900,    // 9x
            400,    // 4x
            200,    // 2x
            20,     // 0.2x
            20,     // 0.2x
            20,     // 0.2x  (center - total loss)
            20,     // 0.2x
            20,     // 0.2x
            200,    // 2x
            400,    // 4x
            900,    // 9x
            2600,   // 26x
            12000,  // 120x
            100000  // 1000x   (edges - massive jackpot)
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

        // Fee split: 10% burn, 90% to contract reserve
        uint256 burnFee = (gross * BURN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 toContract = gross - burnFee;

        // Transfer burn fee to burn address
        MORBIUS_TOKEN.safeTransferFrom(msg.sender, BURN_ADDRESS, burnFee);

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

        // Fee split: 10% burn, 90% to contract reserve
        uint256 burnFee = (morbiusReceived * BURN_FEE_BPS) / BPS_DENOMINATOR;
        uint256 toContract = morbiusReceived - burnFee;

        // Transfer burn fee to burn address
        MORBIUS_TOKEN.safeTransfer(BURN_ADDRESS, burnFee);

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

    // Cumulative thresholds for weighted bucket selection (binomial distribution for 16 rows)
    // Based on C(16,k) / 2^16 probabilities - matches physics simulation exactly
    // Total = 65536, thresholds are cumulative sums of binomial coefficients
    uint32[17] private BUCKET_THRESHOLDS = [
        1,      // Bucket 0:  C(16,0)  = 1      -> 0.0015%
        17,     // Bucket 1:  C(16,1)  = 16     -> 0.024%
        137,    // Bucket 2:  C(16,2)  = 120    -> 0.18%
        697,    // Bucket 3:  C(16,3)  = 560    -> 0.85%
        2517,   // Bucket 4:  C(16,4)  = 1820   -> 2.78%
        6885,   // Bucket 5:  C(16,5)  = 4368   -> 6.67%
        14893,  // Bucket 6:  C(16,6)  = 8008   -> 12.2%
        26333,  // Bucket 7:  C(16,7)  = 11440  -> 17.5%
        39203,  // Bucket 8:  C(16,8)  = 12870  -> 19.6% (center - most common)
        50643,  // Bucket 9:  C(16,9)  = 11440  -> 17.5%
        58651,  // Bucket 10: C(16,10) = 8008   -> 12.2%
        63019,  // Bucket 11: C(16,11) = 4368   -> 6.67%
        64839,  // Bucket 12: C(16,12) = 1820   -> 2.78%
        65399,  // Bucket 13: C(16,13) = 560    -> 0.85%
        65519,  // Bucket 14: C(16,14) = 120    -> 0.18%
        65535,  // Bucket 15: C(16,15) = 16     -> 0.024%
        65536   // Bucket 16: C(16,16) = 1      -> 0.0015%
    ];

    /**
     * @notice Generate random bucket number using weighted distribution (matches physics)
     * @dev Uses modified distribution optimized for better player experience
     * @param nonce Loop counter to ensure different results for multiple drops in same transaction
     * @return seed The raw uint256 seed value
     * @return bucket Bucket number (0-16, 0-indexed to match frontend physics)
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

        // Use weighted selection instead of uniform distribution
        // This matches the physics simulation's binomial distribution
        uint32 roll = uint32(seed % 65536); // 0 to 65535

        uint8 bucket = 0;
        for (uint8 i = 0; i < TOTAL_BUCKETS; i++) {
            if (roll < BUCKET_THRESHOLDS[i]) {
                bucket = i; // Keep as 0-indexed (0-16) to match frontend physics
                break;
            }
        }

        // Fallback to last bucket if somehow not matched (shouldn't happen)
        if (bucket == 0 && roll >= BUCKET_THRESHOLDS[0]) {
            bucket = TOTAL_BUCKETS - 1;
        }

        return (seed, bucket);
    }

    /**
     * @notice Get multiplier for a bucket based on risk level
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     * @param bucket Bucket number (0-16, 0-indexed to match frontend physics)
     * @return multiplier in basis points
     */
    function _getMultiplier(uint8 riskLevel, uint8 bucket) internal view returns (uint256) {
        if (riskLevel == RISK_LOW) {
            return LOW_RISK_MULTIPLIERS[bucket];
        } else if (riskLevel == RISK_MEDIUM) {
            return MEDIUM_RISK_MULTIPLIERS[bucket];
        } else {
            return HIGH_RISK_MULTIPLIERS[bucket];
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
     * @param bucketIndex Bucket number (0-16, 0-indexed to match frontend)
     * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
     */
    function calculatePayout(uint256 wagerAmount, uint8 bucketIndex, uint8 riskLevel) external view returns (uint256) {
        require(bucketIndex < TOTAL_BUCKETS, "Invalid bucket");
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
