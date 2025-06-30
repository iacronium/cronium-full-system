// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFranchiseTokenizer
 * @dev Interface for the FranchiseTokenizer contract.
 * @dev Defines the essential functions that other system contracts, 
 * like ComplianceManager and DividendDistributor, can call.
 * This ensures loose coupling and modularity in the architecture.
 */
interface IFranchiseTokenizer {

    /**
     * @dev Returns the total number of tokens minted for a specific franchise.
     * @param id The ID of the franchise (token ID).
     * @return The current supply of tokens for the given franchise ID.
     */
    function totalSupply(uint256 id) external view returns (uint256);

    /**
     * @dev Returns the number of tokens of a specific franchise (`id`) owned by an `account`.
     * Standard ERC1155 function.
     * @param account The address of the token holder.
     * @param id The ID of the franchise (token ID).
     * @return The token balance of the account for the specified ID.
     */
    function balanceOf(address account, uint256 id) external view returns (uint256);

    /**
     * @dev Mints a specified `amount` of tokens for a `franchiseId` to a `to` address.
     * @dev This function should only be callable by an address with the MINTER_ROLE.
     * In the Cronium system, this role is held by the ComplianceManager contract.
     * @param franchiseId The ID of the franchise for which to mint tokens.
     * @param to The address that will receive the minted tokens.
     * @param amount The number of tokens to mint.
     * @param data Additional data with no specified format (optional).
     */
    function mintTokens(uint256 franchiseId, address to, uint256 amount, bytes memory data) external;
}