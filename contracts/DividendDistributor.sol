// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "./interfaces/IFranchiseTokenizer.sol";

/**
 * @title DividendDistributor
 * @author Cronium Team
 * @notice Manages automated dividend distribution to franchise token holders
 * @dev Integrates with Chainlink Automation for periodic dividend cycles
 * Uses high-precision arithmetic to ensure accurate proportional payouts
 */
contract DividendDistributor is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    /// @notice Reference to the FranchiseTokenizer contract
    IFranchiseTokenizer public immutable franchiseTokenizer;
    
    /// @notice Payment token used for dividend distributions (typically USDC)
    IERC20 public immutable paymentToken;
    
    /// @notice Time interval between dividend cycles (in seconds)
    uint256 public immutable interval;

    /// @notice Precision factor for accurate dividend calculations (10^18)
    uint256 private constant PRECISION_FACTOR = 10**18;

    /**
     * @notice Structure representing a dividend distribution cycle
     * @param cycleId Unique identifier for this cycle
     * @param totalAmount Total dividend amount distributed in this cycle
     * @param perTokenPayout Dividend amount per token (with PRECISION_FACTOR)
     * @param timestamp When this cycle was created
     */
    struct DividendCycle {
        uint256 cycleId;
        uint256 totalAmount;
        uint256 perTokenPayout;
        uint256 timestamp;
    }

    /// @notice Mapping: franchiseId => cumulative dividend payout per token (with PRECISION_FACTOR)
    mapping(uint256 => uint256) public cumulativePayoutPerToken;
    
    /// @notice Mapping: franchiseId => user => last seen cumulativePayoutPerToken
    mapping(uint256 => mapping(address => uint256)) public userLastPayoutPerToken;
    
    /// @notice Mapping: franchiseId => user => accrued but unclaimed dividends
    mapping(uint256 => mapping(address => uint256)) public accruedDividends;

    /// @notice Mapping: franchiseId => pending dividend pool amount
    mapping(uint256 => uint256) public pendingDividendPool;

    /// @notice Mapping: franchiseId => cycleId => DividendCycle (Historical)
    mapping(uint256 => mapping(uint256 => DividendCycle)) public dividendCycles;
    
    /// @notice Mapping: franchiseId => current cycle ID
    mapping(uint256 => uint256) public currentCycleId;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when dividends are deposited for a franchise
     * @param franchiseId The ID of the franchise
     * @param amount The amount of dividends deposited
     * @param depositor The address that deposited the dividends
     */
    event DividendDeposited(uint256 indexed franchiseId, uint256 amount, address indexed depositor);
    
    /**
     * @notice Emitted when a new dividend cycle is started
     * @param franchiseId The ID of the franchise
     * @param cycleId The ID of the new cycle
     * @param perTokenPayout The dividend amount per token (with precision)
     */
    event DividendCycleStarted(uint256 indexed franchiseId, uint256 indexed cycleId, uint256 perTokenPayout);
    
    /**
     * @notice Emitted when a user claims their dividend
     * @param franchiseId The ID of the franchise
     * @param cycleId The ID of the cycle
     * @param user The address of the user claiming
     * @param amount The amount claimed
     */
    event DividendClaimed(uint256 indexed franchiseId, uint256 indexed cycleId, address indexed user, uint256 amount);

    /**
     * @notice Initializes the DividendDistributor contract
     * @param _franchiseTokenizer Address of the FranchiseTokenizer contract
     * @param _paymentToken Address of the payment token for dividends
     * @param _interval Time interval between dividend cycles (in seconds)
     */
    constructor(address _franchiseTokenizer, address _paymentToken, uint256 _interval) Ownable(msg.sender) {
        require(_franchiseTokenizer != address(0) && _paymentToken != address(0), "DividendDistributor: Invalid address");
        require(_interval > 0, "DividendDistributor: Interval must be greater than 0");
        
        franchiseTokenizer = IFranchiseTokenizer(_franchiseTokenizer);
        paymentToken = IERC20(_paymentToken);
        interval = _interval;
    }

    /**
     * @notice Deposits dividends for a specific franchise
     * @dev Dividends are added to pending pool until next cycle is triggered
     * @param franchiseId The ID of the franchise
     * @param amount The amount of dividends to deposit
     * @custom:emits DividendDeposited
     */
    function depositDividends(uint256 franchiseId, uint256 amount) external nonReentrant {
        require(amount > 0, "DividendDistributor: Amount must be positive");
        pendingDividendPool[franchiseId] += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit DividendDeposited(franchiseId, amount, msg.sender);
    }

    /**
     * @notice Checks if upkeep is needed (called by Chainlink Automation)
     * @dev Returns true if interval has passed and there are pending dividends
     * @param checkData Encoded franchiseId to check
     * @return upkeepNeeded True if upkeep should be performed
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes calldata checkData)
        external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 franchiseId = abi.decode(checkData, (uint256));
        uint256 lastTimestamp = dividendCycles[franchiseId][currentCycleId[franchiseId]].timestamp;
        
        bool timeElapsed = (block.timestamp - lastTimestamp) > interval;
        bool hasPendingFunds = pendingDividendPool[franchiseId] > 0;
        bool hasSupply = franchiseTokenizer.totalSupply(franchiseId) > 0;
        
        upkeepNeeded = timeElapsed && hasPendingFunds && hasSupply;
        performData = checkData;
    }

    /**
     * @notice Performs upkeep to create a new dividend cycle (called by Chainlink Automation)
     * @dev Creates new cycle, calculates per-token payout, and updates cumulativePayoutPerToken.
     * Validates conditions inline to avoid the gas overhead and external call of this.checkUpkeep().
     * Anyone can call this function — conditions are enforced on-chain.
     * @param performData Encoded franchiseId to process
     * @custom:emits DividendCycleStarted
     */
    function performUpkeep(bytes calldata performData) external override nonReentrant {
        uint256 franchiseId = abi.decode(performData, (uint256));

        // Re-validate all conditions inline (mirrors checkUpkeep logic).
        // Avoids an external self-call to checkUpkeep which wastes gas and
        // could introduce unexpected call-depth behaviour.
        uint256 lastTimestamp = dividendCycles[franchiseId][currentCycleId[franchiseId]].timestamp;
        require((block.timestamp - lastTimestamp) > interval, "DividendDistributor: Interval not elapsed");
        require(pendingDividendPool[franchiseId] > 0, "DividendDistributor: No pending dividends");

        uint256 franchiseTotalSupply = franchiseTokenizer.totalSupply(franchiseId);
        require(franchiseTotalSupply > 0, "DividendDistributor: Franchise has no supply");

        uint256 dividendAmount = pendingDividendPool[franchiseId];
        pendingDividendPool[franchiseId] = 0;

        uint256 perTokenPayoutWithPrecision = (dividendAmount * PRECISION_FACTOR) / franchiseTotalSupply;

        // Guard against scenarios where the dividend pool is too small relative to
        // the total supply, which would result in zero payout per token and lock
        // the dividend amount in the contract indefinitely.
        // This can happen with low-decimal tokens (e.g. real USDC with 6 decimals)
        // and a very large total supply.
        require(
            perTokenPayoutWithPrecision > 0,
            "DividendDistributor: Dividend per token rounds to zero - increase pool or reduce supply"
        );
        
        // Update cumulative payout
        cumulativePayoutPerToken[franchiseId] += perTokenPayoutWithPrecision;

        // Historical record
        uint256 newCycleId = currentCycleId[franchiseId] + 1;
        dividendCycles[franchiseId][newCycleId] = DividendCycle({
            cycleId: newCycleId,
            totalAmount: dividendAmount,
            perTokenPayout: perTokenPayoutWithPrecision,
            timestamp: block.timestamp
        });
        currentCycleId[franchiseId] = newCycleId;

        emit DividendCycleStarted(franchiseId, newCycleId, perTokenPayoutWithPrecision);
    }

    /**
     * @notice Internal implementation that settles accrued dividends for an account
     * @dev Updates accruedDividends and snapshots userLastPayoutPerToken.
     * Called both from the external hook (FranchiseTokenizer._update) and from
     * claimDividend, avoiding any external self-call.
     * @param franchiseId The ID of the franchise
     * @param account The address of the account to update
     */
    function _updateAccount(uint256 franchiseId, address account) internal {
        if (account == address(0)) return;

        uint256 userBalance = franchiseTokenizer.balanceOf(account, franchiseId);
        if (userBalance > 0) {
            uint256 pending = (userBalance * (cumulativePayoutPerToken[franchiseId] - userLastPayoutPerToken[franchiseId][account])) / PRECISION_FACTOR;
            accruedDividends[franchiseId][account] += pending;
        }

        userLastPayoutPerToken[franchiseId][account] = cumulativePayoutPerToken[franchiseId];
    }

    /**
     * @notice External hook called by FranchiseTokenizer before any token transfer
     * @dev Thin wrapper around _updateAccount so the token contract can settle
     * dividends before balances change. Only FranchiseTokenizer should call this.
     * Restricted to the FranchiseTokenizer address to prevent unsolicited calls.
     * @param franchiseId The ID of the franchise
     * @param account The address of the account to update
     */
    function updateAccount(uint256 franchiseId, address account) external {
        require(
            msg.sender == address(franchiseTokenizer),
            "DividendDistributor: Only FranchiseTokenizer can call updateAccount"
        );
        _updateAccount(franchiseId, account);
    }

    /**
     * @notice Allows token holders to claim their accrued dividends
     * @dev Settles any pending earnings via _updateAccount (internal, no self-call),
     * then transfers the full accrued balance to the caller.
     * @param franchiseId The ID of the franchise
     * @custom:emits DividendClaimed
     */
    function claimDividend(uint256 franchiseId) external nonReentrant {
        // Settle any earnings accrued since the last balance change
        _updateAccount(franchiseId, msg.sender);

        uint256 amount = accruedDividends[franchiseId][msg.sender];
        require(amount > 0, "DividendDistributor: No accrued dividends to claim");

        accruedDividends[franchiseId][msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, amount);

        emit DividendClaimed(franchiseId, currentCycleId[franchiseId], msg.sender, amount);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Permite al propietario recuperar tokens ERC20 enviados por error al contrato
     * @dev No permite retirar el token de pago (USDC) para proteger los dividendos de los usuarios
     * @param tokenAddress Dirección del contrato del token ERC20 a recuperar
     * @param amount Cantidad de tokens a retirar
     */
    function recoverERC20(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(paymentToken), "DividendDistributor: Cannot recover payment token");
        require(amount > 0, "DividendDistributor: Amount must be positive");
        IERC20(tokenAddress).safeTransfer(owner(), amount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Calculates the total pending dividend for a user across all cycles
     * @param user The address of the user
     * @param franchiseId The ID of the franchise
     * @return The amount of dividends the user can claim
     */
    function getPendingDividend(address user, uint256 franchiseId) external view returns (uint256) {
        uint256 userBalance = franchiseTokenizer.balanceOf(user, franchiseId);
        uint256 pendingAccrual = 0;
        
        if (userBalance > 0) {
            pendingAccrual = (userBalance * (cumulativePayoutPerToken[franchiseId] - userLastPayoutPerToken[franchiseId][user])) / PRECISION_FACTOR;
        }
        
        return accruedDividends[franchiseId][user] + pendingAccrual;
    }

    /**
     * @notice Returns complete information about a dividend cycle
     * @param franchiseId The ID of the franchise
     * @param cycleId The ID of the cycle
     * @return cycle The complete DividendCycle struct
     */
    function getDividendCycleInfo(uint256 franchiseId, uint256 cycleId) external view returns (DividendCycle memory) {
        require(cycleId > 0 && cycleId <= currentCycleId[franchiseId], "DividendDistributor: Invalid cycle ID");
        return dividendCycles[franchiseId][cycleId];
    }
}