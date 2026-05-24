// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/IComplianceManager.sol";
import "./interfaces/IDividendDistributor.sol";

/**
 * @title FranchiseTokenizer
 * @author Cronium Team
 * @notice This contract manages the tokenization of real-world franchise assets as ERC1155 tokens
 * @dev Implements ERC1155 for multi-token standard, AccessControl for role-based permissions,
 * and ReentrancyGuard for security against reentrancy attacks
 */
contract FranchiseTokenizer is ERC1155, AccessControl, ReentrancyGuard {
    /// @notice Token collection name
    string public constant name = "Cronium RWA Tokens";

    /// @notice Token collection symbol
    string public constant symbol = "CRN";

    /// @notice Role identifier for franchise managers who can create new franchises
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /// @notice Role identifier for authorized minters (typically the ComplianceManager contract)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Reference to the ComplianceManager contract
    IComplianceManager public complianceManager;

    /// @notice Reference to the DividendDistributor contract
    IDividendDistributor public dividendDistributor;

    /// @notice Counter for the next franchise ID to be created (starts at 1)
    uint256 public nextFranchiseId;

    /**
     * @notice Structure containing all franchise metadata and state
     * @param name Human-readable name of the franchise
     * @param totalValue Total monetary value of the franchise in USD (with 6 decimals)
     * @param maxSupply Maximum number of tokens that can be minted for this franchise
     * @param currentSupply Current number of tokens minted for this franchise
     * @param isActive Whether the franchise is currently active and can mint tokens
     * @param realWorldManager Address of the real-world franchise manager
     */
    struct Franchise {
        string name;
        uint256 totalValue;
        uint256 maxSupply;
        uint256 currentSupply;
        bool isActive;
        address realWorldManager;
    }
    
    /// @notice Mapping from franchise ID to Franchise struct
    mapping(uint256 => Franchise) public franchises;
    
    /**
     * @notice Initializes the FranchiseTokenizer contract
     * @dev Grants initial roles to the deployer. These should be reassigned before production
     * @param _baseUri Base URI for token metadata (e.g., "ipfs://cronium-meta/")
     */
    constructor(string memory _baseUri) ERC1155(_baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        nextFranchiseId = 1;
    }
    
    /**
     * @notice Creates a new franchise with specified parameters
     * @dev Only callable by addresses with MANAGER_ROLE. Automatically increments nextFranchiseId
     * @param _name The name of the franchise (e.g., "Cronium Burger #1")
     * @param totalValue The total monetary value of the franchise in USD (with 6 decimals)
     * @param _maxSupply The maximum number of tokens that can be minted for this franchise
     * @param manager The address of the real-world franchise manager
     * @custom:emits FranchiseCreated
     */
    function createFranchise(
        string memory _name,
        uint256 totalValue,
        uint256 _maxSupply,
        address manager
    ) external onlyRole(MANAGER_ROLE) {
        uint256 franchiseId = nextFranchiseId;
        
        require(_maxSupply > 0, "FranchiseTokenizer: Max supply must be greater than 0");
        require(manager != address(0), "FranchiseTokenizer: Manager cannot be zero address");
        require(bytes(_name).length > 0, "FranchiseTokenizer: Name cannot be empty");

        franchises[franchiseId] = Franchise({
            name: _name,
            totalValue: totalValue,
            maxSupply: _maxSupply,
            currentSupply: 0,
            isActive: true,
            realWorldManager: manager
        });
        
        nextFranchiseId++;

        emit FranchiseCreated(franchiseId, _name, totalValue, _maxSupply, manager);
    }
    
    /**
     * @notice Mints franchise tokens to a specified address
     * @dev Only callable by addresses with MINTER_ROLE (typically ComplianceManager)
     * Protected against reentrancy attacks. Validates supply limits before minting
     * @param franchiseId The ID of the franchise for which to mint tokens
     * @param to The address that will receive the minted tokens
     * @param amount The number of tokens to mint
     * @param data Additional data with no specified format (for ERC1155 compatibility)
     * @custom:emits TokensMinted
     * @custom:emits TransferSingle (from ERC1155)
     */
    function mintTokens(
        uint256 franchiseId,
        address to,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(franchises[franchiseId].isActive, "FranchiseTokenizer: Franchise not active");
        require(to != address(0), "FranchiseTokenizer: Cannot mint to zero address");
        require(amount > 0, "FranchiseTokenizer: Amount must be greater than 0");
        
        require(
            franchises[franchiseId].currentSupply + amount <= franchises[franchiseId].maxSupply,
            "Exceeds max supply for this franchise"
        );
        
        franchises[franchiseId].currentSupply += amount;
        _mint(to, franchiseId, amount, data);
        
        emit TokensMinted(franchiseId, to, amount);
    }

    /**
     * @notice Returns the current total supply of tokens for a specific franchise
     * @param id The franchise ID to query
     * @return The current number of tokens minted for this franchise
     */
    function totalSupply(uint256 id) public view returns (uint256) {
        return franchises[id].currentSupply;
    }

    /**
     * @notice Returns complete information about a franchise
     * @param franchiseId The ID of the franchise to query
     * @return franchise The complete Franchise struct with all metadata
     */
    function getFranchiseInfo(uint256 franchiseId) external view returns (Franchise memory) {
        require(franchiseId > 0 && franchiseId < nextFranchiseId, "FranchiseTokenizer: Invalid franchise ID");
        return franchises[franchiseId];
    }

    /**
     * @notice Returns the URI for a given token ID
     * @dev Returns a base64 encoded data URI with dynamic on-chain metadata (name, description, etc.)
     * @param id The token ID to query
     * @return The dynamic data URI, or empty if invalid ID
     */
    function uri(uint256 id) public view virtual override returns (string memory) {
        if (id == 0 || id >= nextFranchiseId) {
            return super.uri(id);
        }
        Franchise memory franchise = franchises[id];
        
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "', franchise.name, '", ',
                        '"description": "Real World Asset token representing fractional ownership in Cronium ', franchise.name, ' operations on Base.", ',
                        '"image": "https://croniumrwa.netlify.app/cronium-icon.png", ',
                        '"properties": {',
                            '"franchiseId": ', Strings.toString(id), ', ',
                            '"totalValue": "', Strings.toString(franchise.totalValue), '", ',
                            '"maxSupply": "', Strings.toString(franchise.maxSupply), '"',
                        '}}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @notice Changes the active status of a franchise
     * @dev Only callable by addresses with MANAGER_ROLE
     * @param franchiseId The ID of the franchise to modify
     * @param status The new active status (true = active, false = inactive)
     * @custom:emits FranchiseStatusChanged
     */
    function setFranchiseStatus(uint256 franchiseId, bool status) external onlyRole(MANAGER_ROLE) {
        require(franchiseId > 0 && franchiseId < nextFranchiseId, "FranchiseTokenizer: Invalid franchise ID");
        franchises[franchiseId].isActive = status;
        emit FranchiseStatusChanged(franchiseId, status);
    }

    /**
     * @notice Sets the ComplianceManager contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param _complianceManager The address of the ComplianceManager contract
     */
    function setComplianceManager(address _complianceManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_complianceManager != address(0), "FranchiseTokenizer: Compliance manager cannot be zero address");
        complianceManager = IComplianceManager(_complianceManager);
    }

    /**
     * @notice Sets the DividendDistributor contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param _dividendDistributor The address of the DividendDistributor contract
     */
    function setDividendDistributor(address _dividendDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_dividendDistributor != address(0), "FranchiseTokenizer: Dividend distributor cannot be zero address");
        dividendDistributor = IDividendDistributor(_dividendDistributor);
    }

    /**
     * @notice Hook that is called before any token transfer
     * @dev Overridden to enforce KYC checks and settle dividends
     * @param from The address tokens are transferred from (address(0) for minting)
     * @param to The address tokens are transferred to
     * @param ids Array of token IDs
     * @param values Array of token amounts
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Settle dividends for from and to addresses before balance changes
        if (address(dividendDistributor) != address(0)) {
            uint256 length = ids.length;
            for (uint256 i = 0; i < length; ) {
                dividendDistributor.updateAccount(ids[i], from);
                dividendDistributor.updateAccount(ids[i], to);
                unchecked { i++; }
            }
        }

        super._update(from, to, ids, values);

        // Check KYC status for 'to' address if it's not a burn (to != address(0))
        // And if compliance manager is set
        if (to != address(0) && address(complianceManager) != address(0)) {
            require(complianceManager.isVerified(to), "FranchiseTokenizer: Receiver not KYC verified");
        }
    }

    /**
     * @notice Checks if the contract implements an interface
     * @dev Overrides both ERC1155 and AccessControl implementations
     * @param interfaceId The interface identifier to check
     * @return bool True if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when a new franchise is created
     * @param franchiseId The unique ID of the newly created franchise
     * @param name The name of the franchise
     * @param totalValue The total monetary value of the franchise
     * @param maxSupply The maximum supply of tokens for this franchise
     * @param manager The address of the franchise manager
     */
    event FranchiseCreated(
        uint256 indexed franchiseId,
        string name,
        uint256 totalValue,
        uint256 maxSupply,
        address indexed manager
    );

    /**
     * @notice Emitted when tokens are minted for a franchise
     * @param franchiseId The ID of the franchise
     * @param to The address receiving the tokens
     * @param amount The number of tokens minted
     */
    event TokensMinted(
        uint256 indexed franchiseId,
        address indexed to,
        uint256 amount
    );

    /**
     * @notice Emitted when a franchise's active status changes
     * @param franchiseId The ID of the franchise
     * @param isActive The new active status
     */
    event FranchiseStatusChanged(
        uint256 indexed franchiseId,
        bool isActive
    );
}