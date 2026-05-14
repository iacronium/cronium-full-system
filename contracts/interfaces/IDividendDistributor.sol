// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDividendDistributor
 * @notice Interface for the DividendDistributor contract
 */
interface IDividendDistributor {
    /**
     * @notice Updates the accrued dividends for an account
     * @dev Called by the token contract before any balance changes
     * @param franchiseId The ID of the franchise
     * @param account The address of the account to update
     */
    function updateAccount(uint256 franchiseId, address account) external;
}
