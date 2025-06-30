// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFranchiseTokenizer.sol";

contract ComplianceManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant KYC_ADMIN_ROLE = keccak256("KYC_ADMIN_ROLE");
    
    IFranchiseTokenizer public immutable franchiseTokenizer;
    IERC20 public immutable paymentToken;
    address public immutable treasury;

    // <<< MEJORA 1: Variable de estado para el modo de demostración >>>
    bool public demoModeActive;

    enum KYCStatus { None, Pending, Verified, Rejected }
    mapping(address => KYCStatus) public kycStatus;

    event KYCStatusUpdated(address indexed user, KYCStatus newStatus);
    event TokensPurchased(address indexed buyer, uint256 indexed franchiseId, uint256 tokenAmount, uint256 paymentAmount);
    event DemoModeToggled(bool isActive); // Evento para registrar cambios en el modo demo

    constructor(
        address _tokenizerAddress,
        address _paymentTokenAddress,
        address _treasuryAddress
    ) {
        require(_tokenizerAddress != address(0), "Tokenizer address cannot be zero");
        require(_paymentTokenAddress != address(0), "Payment token address cannot be zero");
        require(_treasuryAddress != address(0), "Treasury address cannot be zero");

        franchiseTokenizer = IFranchiseTokenizer(_tokenizerAddress);
        paymentToken = IERC20(_paymentTokenAddress);
        treasury = _treasuryAddress;
        
        // Por seguridad, el modo demo siempre empieza desactivado.
        demoModeActive = false; 

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KYC_ADMIN_ROLE, msg.sender);
    }

    // <<< MEJORA 2: Función para que solo el dueño pueda cambiar el modo demo >>>
    function setDemoMode(bool _active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        demoModeActive = _active;
        emit DemoModeToggled(_active);
    }

    function setKYCStatus(address user, KYCStatus status) external onlyRole(KYC_ADMIN_ROLE) {
        require(user != address(0), "User address cannot be zero");
        kycStatus[user] = status;
        emit KYCStatusUpdated(user, status);
    }
    
    // <<< MEJORA 3: Modificador "inteligente" que respeta el modo demo >>>
    modifier onlyKYCVerified() {
        if (demoModeActive) {
            _; // Si el modo demo está activo, se salta la verificación de KYC.
            return;
        }
        require(kycStatus[msg.sender] == KYCStatus.Verified, "ComplianceManager: KYC not verified");
        _;
    }

    function purchaseTokens(
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 expectedPaymentAmount
    ) 
        external 
        onlyKYCVerified // Este modificador ahora es flexible
        nonReentrant 
    {
        require(tokenAmount > 0, "Must purchase at least one token");
        require(expectedPaymentAmount > 0, "Payment amount must be greater than zero");

        paymentToken.safeTransferFrom(msg.sender, treasury, expectedPaymentAmount);

        franchiseTokenizer.mintTokens(franchiseId, msg.sender, tokenAmount, bytes(""));

        emit TokensPurchased(msg.sender, franchiseId, tokenAmount, expectedPaymentAmount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}