// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IComplianceManager
 * @notice Interface for the ComplianceManager contract
 */
interface IComplianceManager {
    /**
     * @notice Checks if a user is KYC verified
     * @param user The address of the user to check
     * @return bool True if the user is verified or if demo mode is active
     */
    function isVerified(address user) external view returns (bool);

    /**
     * @notice Allows authorized cross-chain receivers to purchase tokens on behalf of a buyer
     * @dev Only callable by addresses with CCIP_RECEIVER_ROLE
     * @param buyer The address that will receive the minted tokens
     * @param franchiseId The ID of the franchise to purchase tokens from
     * @param tokenAmount The number of tokens to purchase
     * @param expectedPaymentAmount The amount of payment tokens to transfer
     */
    function purchaseTokensFor(
        address buyer,
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 expectedPaymentAmount
    ) external;
}
