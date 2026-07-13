// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFranchiseTokenizer.sol";

/**
 * @title ComplianceManager
 * @author Cronium Team
 * @notice Manages KYC compliance and token sales for franchise investments
 * @dev Acts as the gatekeeper for primary token sales, ensuring all investors are KYC verified
 * Holds MINTER_ROLE on FranchiseTokenizer to mint tokens upon successful purchase
 */
contract ComplianceManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role identifier for KYC administrators who can verify investors
    bytes32 public constant KYC_ADMIN_ROLE = keccak256("KYC_ADMIN_ROLE");

    /// @notice Role identifier for CCIP receivers authorized to purchase on behalf of buyers
    bytes32 public constant CCIP_RECEIVER_ROLE = keccak256("CCIP_RECEIVER_ROLE");
    
    /// @notice Reference to the FranchiseTokenizer contract
    IFranchiseTokenizer public immutable franchiseTokenizer;
    
    /// @notice Payment token used for purchases (typically USDC)
    IERC20 public immutable paymentToken;
    
    /// @notice Treasury address where payments are sent
    address public immutable treasury;

    /// @notice Flag to enable/disable demo mode (bypasses KYC checks when true)
    /// @dev Should be false in production. Only for testing purposes
    bool public demoModeActive;

    /**
     * @notice KYC status enumeration
     * @param None No KYC application submitted
     * @param Pending KYC application under review
     * @param Verified KYC approved - can purchase tokens
     * @param Rejected KYC rejected - cannot purchase tokens
     */
    enum KYCStatus { None, Pending, Verified, Rejected }
    
    /// @notice Mapping from user address to their KYC status
    mapping(address => KYCStatus) public kycStatus;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when a user's KYC status is updated
     * @param user The address of the user
     * @param newStatus The new KYC status
     */
    event KYCStatusUpdated(address indexed user, KYCStatus newStatus);
    
    /**
     * @notice Emitted when tokens are successfully purchased
     * @param buyer The address of the token buyer
     * @param franchiseId The ID of the franchise
     * @param tokenAmount The number of tokens purchased
     * @param paymentAmount The amount paid in payment tokens
     * @param pricePerToken The effective price per token
     */
    event TokensPurchased(
        address indexed buyer, 
        uint256 indexed franchiseId, 
        uint256 tokenAmount, 
        uint256 paymentAmount,
        uint256 pricePerToken
    );
    
    /**
     * @notice Emitted when demo mode is toggled
     * @param isActive The new demo mode status
     */
    event DemoModeToggled(bool isActive);

    /**
     * @notice Emitted when tokens are purchased on behalf of a buyer (cross-chain)
     * @param buyer The address of the token buyer (receives the tokens)
     * @param caller The address that initiated the purchase (CCIP receiver)
     * @param franchiseId The ID of the franchise
     * @param tokenAmount The number of tokens purchased
     * @param paymentAmount The amount paid in payment tokens
     */
    event TokensPurchasedFor(
        address indexed buyer,
        address indexed caller,
        uint256 indexed franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount
    );

    /**
     * @notice Initializes the ComplianceManager contract
     * @dev Demo mode starts disabled for security. Grant roles to deployer
     * @param _tokenizerAddress Address of the FranchiseTokenizer contract
     * @param _paymentTokenAddress Address of the payment token (e.g., USDC)
     * @param _treasuryAddress Address where payments will be sent
     */
    constructor(
        address _tokenizerAddress,
        address _paymentTokenAddress,
        address _treasuryAddress
    ) {
        require(_tokenizerAddress != address(0), "ComplianceManager: Tokenizer address cannot be zero");
        require(_paymentTokenAddress != address(0), "ComplianceManager: Payment token address cannot be zero");
        require(_treasuryAddress != address(0), "ComplianceManager: Treasury address cannot be zero");

        franchiseTokenizer = IFranchiseTokenizer(_tokenizerAddress);
        paymentToken = IERC20(_paymentTokenAddress);
        treasury = _treasuryAddress;
        
        demoModeActive = false;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KYC_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Toggles demo mode on/off
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Demo mode bypasses KYC checks
     * WARNING: Should only be enabled for testing, never in production
     * @param _active True to enable demo mode, false to disable
     * @custom:emits DemoModeToggled
     */
    function setDemoMode(bool _active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        demoModeActive = _active;
        emit DemoModeToggled(_active);
    }

    /**
     * @notice Sets the KYC status for a single user
     * @dev Only callable by KYC_ADMIN_ROLE
     * @param user The address of the user
     * @param status The new KYC status to assign
     * @custom:emits KYCStatusUpdated
     */
    function setKYCStatus(address user, KYCStatus status) external onlyRole(KYC_ADMIN_ROLE) {
        require(user != address(0), "ComplianceManager: User address cannot be zero");
        kycStatus[user] = status;
        emit KYCStatusUpdated(user, status);
    }
    
    /**
     * @notice Sets the KYC status for multiple users in a single transaction
     * @dev Only callable by KYC_ADMIN_ROLE. Gas-efficient for bulk operations
     * @param users Array of user addresses
     * @param status The KYC status to assign to all users
     * @custom:emits KYCStatusUpdated (once per user)
     */
    function batchSetKYCStatus(address[] calldata users, KYCStatus status) external onlyRole(KYC_ADMIN_ROLE) {
        uint256 length = users.length;
        require(length > 0, "ComplianceManager: Empty users array");
        require(length <= 100, "ComplianceManager: Batch size too large");
        
        for (uint256 i = 0; i < length; ) {
            require(users[i] != address(0), "ComplianceManager: User address cannot be zero");
            kycStatus[users[i]] = status;
            emit KYCStatusUpdated(users[i], status);
            unchecked { i++; }
        }
    }
    
    /**
     * @notice Modifier that checks KYC verification status
     * @dev Bypasses check if demo mode is active. Otherwise requires Verified status
     */
    modifier onlyKYCVerified() {
        require(isVerified(msg.sender), "ComplianceManager: KYC not verified");
        _;
    }

    /**
     * @notice Checks if a user is KYC verified
     * @dev Bypasses check if demo mode is active. Otherwise requires Verified status
     * @param user The address of the user to check
     * @return bool True if the user is verified or if demo mode is active
     */
    function isVerified(address user) public view returns (bool) {
        if (demoModeActive) {
            return true;
        }
        return kycStatus[user] == KYCStatus.Verified;
    }

    /**
     * @notice Allows KYC-verified users to purchase franchise tokens
     * @dev Transfers payment to treasury, then mints tokens to buyer
     * Protected by nonReentrant and onlyKYCVerified modifiers
     * @param franchiseId The ID of the franchise to purchase tokens from
     * @param tokenAmount The number of tokens to purchase
     * @param expectedPaymentAmount The amount of payment tokens to transfer
     * @custom:emits TokensPurchased
     */
    function purchaseTokens(
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 expectedPaymentAmount
    ) 
        external 
        onlyKYCVerified
        nonReentrant 
    {
        require(tokenAmount > 0, "ComplianceManager: Must purchase at least one token");
        require(expectedPaymentAmount > 0, "ComplianceManager: Payment amount must be greater than zero");

        // Fetch franchise info to verify price
        IFranchiseTokenizer.Franchise memory franchise = franchiseTokenizer.getFranchiseInfo(franchiseId);
        require(franchise.isActive, "ComplianceManager: Franchise not active");

        // Calculate required payment: (totalValue * tokenAmount) / maxSupply
        // Note: totalValue and payment tokens (USDC) both typically use 6 decimals
        uint256 requiredPayment = (franchise.totalValue * tokenAmount) / franchise.maxSupply;
        require(requiredPayment > 0, "ComplianceManager: Price rounds to zero, purchase more tokens");
        require(expectedPaymentAmount >= requiredPayment, "ComplianceManager: Insufficient payment amount");

        paymentToken.safeTransferFrom(msg.sender, treasury, requiredPayment);
        franchiseTokenizer.mintTokens(franchiseId, msg.sender, tokenAmount, bytes(""));

        uint256 pricePerToken = requiredPayment / tokenAmount;
        emit TokensPurchased(msg.sender, franchiseId, tokenAmount, requiredPayment, pricePerToken);
    }

    /**
     * @notice Allows authorized CCIP receivers to purchase tokens on behalf of a cross-chain buyer
     * @dev Only callable by addresses with CCIP_RECEIVER_ROLE.
     * The caller (CCIP receiver) transfers the payment and the tokens are minted to `buyer`.
     * KYC is checked for `buyer` (bypassed in demo mode).
     * @param buyer The address that will receive the minted tokens
     * @param franchiseId The ID of the franchise to purchase tokens from
     * @param tokenAmount The number of tokens to purchase
     * @param expectedPaymentAmount The amount of payment tokens to transfer
     * @custom:emits TokensPurchasedFor
     */
    function purchaseTokensFor(
        address buyer,
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 expectedPaymentAmount
    )
        external
        onlyRole(CCIP_RECEIVER_ROLE)
        nonReentrant
    {
        require(buyer != address(0), "ComplianceManager: Buyer cannot be zero address");
        require(tokenAmount > 0, "ComplianceManager: Must purchase at least one token");
        require(expectedPaymentAmount > 0, "ComplianceManager: Payment amount must be greater than zero");
        require(isVerified(buyer), "ComplianceManager: Buyer KYC not verified");

        // Fetch franchise info to verify price
        IFranchiseTokenizer.Franchise memory franchise = franchiseTokenizer.getFranchiseInfo(franchiseId);
        require(franchise.isActive, "ComplianceManager: Franchise not active");

        // Calculate required payment: (totalValue * tokenAmount) / maxSupply
        uint256 requiredPayment = (franchise.totalValue * tokenAmount) / franchise.maxSupply;
        require(requiredPayment > 0, "ComplianceManager: Price rounds to zero, purchase more tokens");
        require(expectedPaymentAmount >= requiredPayment, "ComplianceManager: Insufficient payment amount");

        // The CCIP receiver holds the USDC and pays the treasury
        paymentToken.safeTransferFrom(msg.sender, treasury, requiredPayment);

        // Mint tokens directly to the cross-chain buyer
        franchiseTokenizer.mintTokens(franchiseId, buyer, tokenAmount, bytes(""));

        emit TokensPurchasedFor(buyer, msg.sender, franchiseId, tokenAmount, requiredPayment);
    }

    /**
     * @notice Checks if the contract implements an interface
     * @dev Overrides AccessControl implementation
     * @param interfaceId The interface identifier to check
     * @return bool True if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}