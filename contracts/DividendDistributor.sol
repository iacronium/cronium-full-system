// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "./interfaces/IFranchiseTokenizer.sol";

contract DividendDistributor is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    IFranchiseTokenizer public immutable franchiseTokenizer;
    IERC20 public immutable paymentToken;
    uint256 public immutable interval;

    // <<< MEJORA: Añadimos un factor de precisión para los cálculos >>>
    uint256 private constant PRECISION_FACTOR = 10**18;

    struct DividendCycle {
        uint256 cycleId;
        uint256 totalAmount;
        uint256 perTokenPayout; // Ahora se guardará con precisión
        uint256 timestamp;
    }

    mapping(uint256 => mapping(uint256 => DividendCycle)) public dividendCycles;
    mapping(uint256 => uint256) public currentCycleId;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasClaimed;
    mapping(uint256 => uint256) public pendingDividendPool;

    event DividendDeposited(uint256 indexed franchiseId, uint256 amount, address indexed depositor);
    event DividendCycleStarted(uint256 indexed franchiseId, uint256 indexed cycleId, uint256 perTokenPayout);
    event DividendClaimed(uint256 indexed franchiseId, uint256 indexed cycleId, address indexed user, uint256 amount);

    constructor(address _franchiseTokenizer, address _paymentToken, uint256 _interval) Ownable(msg.sender) {
        require(_franchiseTokenizer != address(0) && _paymentToken != address(0), "Invalid address");
        franchiseTokenizer = IFranchiseTokenizer(_franchiseTokenizer);
        paymentToken = IERC20(_paymentToken);
        interval = _interval;
    }

    function depositDividends(uint256 franchiseId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        pendingDividendPool[franchiseId] += amount;
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit DividendDeposited(franchiseId, amount, msg.sender);
    }

    function checkUpkeep(bytes calldata checkData)
        external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 franchiseId = abi.decode(checkData, (uint256));
        uint256 lastTimestamp = dividendCycles[franchiseId][currentCycleId[franchiseId]].timestamp;
        
        bool timeElapsed = (block.timestamp - lastTimestamp) > interval;
        bool hasPendingFunds = pendingDividendPool[franchiseId] > 0;
        
        upkeepNeeded = timeElapsed && hasPendingFunds;
        performData = checkData;
    }

    function performUpkeep(bytes calldata performData) external override nonReentrant {
        (bool upkeepNeeded, ) = this.checkUpkeep(performData);
        require(upkeepNeeded, "Upkeep not needed for this franchise");

        uint256 franchiseId = abi.decode(performData, (uint256));
        uint256 franchiseTotalSupply = franchiseTokenizer.totalSupply(franchiseId);
        require(franchiseTotalSupply > 0, "Franchise has no supply");

        uint256 newCycleId = currentCycleId[franchiseId] + 1;
        uint256 dividendAmount = pendingDividendPool[franchiseId];
        pendingDividendPool[franchiseId] = 0;

        // <<< MEJORA: Cálculo con alta precisión >>>
        uint256 perTokenPayoutWithPrecision = (dividendAmount * PRECISION_FACTOR) / franchiseTotalSupply;

        dividendCycles[franchiseId][newCycleId] = DividendCycle({
            cycleId: newCycleId,
            totalAmount: dividendAmount,
            perTokenPayout: perTokenPayoutWithPrecision,
            timestamp: block.timestamp
        });

        currentCycleId[franchiseId] = newCycleId;
        emit DividendCycleStarted(franchiseId, newCycleId, perTokenPayoutWithPrecision);
    }

    function claimDividend(uint256 franchiseId, uint256 cycleId) external nonReentrant {
        require(cycleId > 0 && cycleId <= currentCycleId[franchiseId], "Invalid cycle ID");
        require(!hasClaimed[franchiseId][cycleId][msg.sender], "Dividend already claimed for this cycle");

        DividendCycle storage cycle = dividendCycles[franchiseId][cycleId];
        uint256 userBalance = franchiseTokenizer.balanceOf(msg.sender, franchiseId);
        require(userBalance > 0, "No tokens held for this franchise");

        // <<< MEJORA: Se ajusta el cálculo final para quitar la precisión extra >>>
        uint256 payoutAmount = (userBalance * cycle.perTokenPayout) / PRECISION_FACTOR;
        require(payoutAmount > 0, "No payout for this amount");

        hasClaimed[franchiseId][cycleId][msg.sender] = true;
        paymentToken.safeTransfer(msg.sender, payoutAmount);

        emit DividendClaimed(franchiseId, cycleId, msg.sender, payoutAmount);
    }
}