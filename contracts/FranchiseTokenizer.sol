// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FranchiseTokenizer is ERC1155, AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public nextFranchiseId;

    struct Franchise {
        string name;
        uint256 totalValue;       // Valor monetario de la franquicia (ej. en USD)
        // <<< CAMBIO CRÍTICO: Añadido para controlar el suministro máximo de tokens >>>
        uint256 maxSupply;        // Suministro máximo de tokens (fracciones)
        uint256 currentSupply;    // Suministro actual de tokens acuñados
        bool isActive;
        address realWorldManager; // Dirección del gestor en el mundo real
    }
    
    mapping(uint256 => Franchise) public franchises;
    
    constructor(string memory uri) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // <<< RECOMENDACIÓN: El manager y minter inicial puede ser el deployer,
        // pero deben ser reasignados antes de producción. >>>
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        nextFranchiseId = 1;
    }
    
    // <<< CAMBIO: Se añade el parámetro _maxSupply >>>
    function createFranchise(
        string memory name,
        uint256 totalValue,
        uint256 _maxSupply,
        address manager
    ) external onlyRole(MANAGER_ROLE) {
        uint256 franchiseId = nextFranchiseId;
        
        // <<< CAMBIO: Se añade un require para asegurar que maxSupply sea > 0 >>>
        require(_maxSupply > 0, "Max supply must be greater than 0");

        franchises[franchiseId] = Franchise({
            name: name,
            totalValue: totalValue,
            maxSupply: _maxSupply, // Se guarda el suministro máximo
            currentSupply: 0,
            isActive: true,
            realWorldManager: manager
        });
        
        nextFranchiseId++;

        // Es buena práctica emitir un evento
        emit FranchiseCreated(franchiseId, name, totalValue, _maxSupply, manager);
    }
    
    function mintTokens(
        uint256 franchiseId,
        address to,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(franchises[franchiseId].isActive, "Franchise not active");
        
        // <<< CAMBIO CRÍTICO: Verificación de sobre-acuñación >>>
        require(
            franchises[franchiseId].currentSupply + amount <= franchises[franchiseId].maxSupply,
            "Exceeds max supply for this franchise"
        );
        
        franchises[franchiseId].currentSupply += amount;
        _mint(to, franchiseId, amount, data);
    }

    // <<< RECOMENDACIÓN: Mantener esta función de utilidad >>>
    function totalSupply(uint256 id) public view returns (uint256) {
        return franchises[id].currentSupply;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // <<< RECOMENDACIÓN: Añadir eventos para mejorar la trazabilidad off-chain >>>
    event FranchiseCreated(
        uint256 indexed franchiseId,
        string name,
        uint256 totalValue,
        uint256 maxSupply,
        address indexed manager
    );
}