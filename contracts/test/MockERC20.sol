// contracts/test/MockERC20.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Contrato ERC20 de prueba para usar en el entorno de testing.
 * Acepta un nombre y un símbolo en el constructor, y tiene una función `mint`
 * que solo puede ser llamada por el dueño (el desplegador de la prueba).
 */
contract MockERC20 is ERC20, Ownable {
    constructor(
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}