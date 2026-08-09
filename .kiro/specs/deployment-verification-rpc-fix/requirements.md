# Requirements Document

## Introduction

This document specifies requirements for implementing deployment verification functionality in the Cronium MVP frontend application deployed on Base Sepolia testnet. The primary focus is resolving the `nextFranchiseId()` RPC call reversion issue and implementing a verify-deployment-first approach that blocks UI rendering until all critical contract data has been successfully loaded and validated.

The feature ensures deployment integrity by verifying contract accessibility, data availability, and RPC endpoint functionality before presenting any user interface, thereby preventing broken states and improving user experience during initial deployment verification.

## Glossary

- **Deployment_Verification_System**: Frontend module responsible for validating contract deployment status and data accessibility before rendering application UI
- **FranchiseTokenizer_Contract**: Smart contract deployed on Base Sepolia that manages franchise tokenization, located at the address specified in NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS
- **RPC_Endpoint**: Remote Procedure Call endpoint used to query blockchain state, provided by Infura or other providers
- **Contract_Data**: Blockchain state data retrieved from smart contracts, including nextFranchiseId, franchise information, and configuration
- **Loading_State**: UI state displaying verification progress while Contract_Data is being loaded
- **Application_UI**: Main user interface rendered after successful deployment verification
- **Verification_Error_UI**: Error interface displayed when deployment verification fails
- **nextFranchiseId_Call**: Read-only contract function call that returns the next franchise ID counter value
- **Base_Sepolia**: Ethereum testnet network where contracts are deployed, chain ID 84532

## Requirements

### Requirement 1: Verify Deployment Before UI Rendering

**User Story:** As a developer, I want the frontend to verify contract deployment before rendering any UI, so that I can immediately identify deployment or RPC configuration issues without manual testing

#### Acceptance Criteria

1. WHEN THE Application loads, THE Deployment_Verification_System SHALL execute before rendering Application_UI
2. WHILE verification is in progress, THE Deployment_Verification_System SHALL display Loading_State to the user
3. THE Deployment_Verification_System SHALL retrieve Contract_Data from FranchiseTokenizer_Contract using RPC_Endpoint
4. THE Deployment_Verification_System SHALL validate nextFranchiseId_Call returns a numeric value
5. IF nextFranchiseId_Call reverts or returns invalid data, THEN THE Deployment_Verification_System SHALL display Verification_Error_UI
6. WHEN Contract_Data is successfully loaded and validated, THE Deployment_Verification_System SHALL render Application_UI
7. THE Deployment_Verification_System SHALL NOT render Application_UI before Contract_Data validation completes

### Requirement 2: Detailed RPC Error Diagnostics

**User Story:** As a developer, I want detailed error messages when nextFranchiseId() fails, so that I can quickly diagnose whether the issue is with RPC configuration, contract deployment, or network connectivity

#### Acceptance Criteria

1. WHEN nextFranchiseId_Call fails, THE Verification_Error_UI SHALL display the contract address being queried
2. WHEN nextFranchiseId_Call fails, THE Verification_Error_UI SHALL display the network name and chain ID
3. WHEN nextFranchiseId_Call fails, THE Verification_Error_UI SHALL display the RPC endpoint being used
4. WHEN nextFranchiseId_Call fails, THE Verification_Error_UI SHALL display the error message from the blockchain client
5. THE Verification_Error_UI SHALL display diagnostic information including contract ABI method signature
6. THE Verification_Error_UI SHALL provide actionable suggestions for resolving the verification failure
7. WHERE developer tools are available, THE Verification_Error_UI SHALL log detailed debugging information to the browser console

### Requirement 3: Multi-Endpoint Validation

**User Story:** As a developer, I want the verification system to check multiple contract endpoints, so that I can ensure complete deployment validation beyond just nextFranchiseId

#### Acceptance Criteria

1. THE Deployment_Verification_System SHALL verify FranchiseTokenizer_Contract address is not zero address
2. THE Deployment_Verification_System SHALL verify RPC_Endpoint connection to Base_Sepolia network
3. THE Deployment_Verification_System SHALL retrieve nextFranchiseId value from FranchiseTokenizer_Contract
4. WHERE nextFranchiseId value is greater than one, THE Deployment_Verification_System SHALL retrieve franchise information for franchiseId one
5. THE Deployment_Verification_System SHALL validate retrieved Contract_Data has expected structure and types
6. IF any validation step fails, THEN THE Deployment_Verification_System SHALL display Verification_Error_UI with specific failure reason
7. THE Deployment_Verification_System SHALL perform all validation steps sequentially in the order specified

### Requirement 4: Clear Visual Feedback During Verification

**User Story:** As a user, I want clear visual feedback during deployment verification, so that I understand the application is loading and not frozen

#### Acceptance Criteria

1. WHEN Deployment_Verification_System begins execution, THE Loading_State SHALL be displayed within 100 milliseconds
2. THE Loading_State SHALL display a progress indicator showing verification is in progress
3. THE Loading_State SHALL display text message indicating deployment verification is occurring
4. THE Loading_State SHALL use the design system specified colors, typography, and spacing
5. THE Loading_State SHALL remain visible until verification completes or fails
6. WHEN verification completes successfully, THE Loading_State SHALL transition to Application_UI
7. THE Loading_State SHALL NOT display any interactive controls or navigation elements

### Requirement 5: Error Handling and Recovery with Retry Logic

**User Story:** As a developer, I want the verification system to implement proper error handling and recovery, so that transient network issues do not permanently block the application

#### Acceptance Criteria

1. WHEN RPC_Endpoint request fails with network timeout, THE Deployment_Verification_System SHALL retry the request
2. THE Deployment_Verification_System SHALL retry failed requests up to three times with exponential backoff
3. THE Deployment_Verification_System SHALL wait two seconds before first retry attempt
4. THE Deployment_Verification_System SHALL wait four seconds before second retry attempt
5. THE Deployment_Verification_System SHALL wait eight seconds before third retry attempt
6. IF all retry attempts fail, THEN THE Deployment_Verification_System SHALL display Verification_Error_UI
7. THE Verification_Error_UI SHALL include a manual retry button that restarts verification process

### Requirement 6: TypeScript Type Safety for Verification Data

**User Story:** As a developer, I want proper TypeScript typing for all verification data structures, so that I can catch type errors at compile time and ensure data integrity

#### Acceptance Criteria

1. THE Deployment_Verification_System SHALL define TypeScript interface for Contract_Data structure
2. THE Deployment_Verification_System SHALL define TypeScript interface for verification result types
3. THE Deployment_Verification_System SHALL define TypeScript type guards for validating Contract_Data
4. THE Deployment_Verification_System SHALL use typed error classes for different failure modes
5. THE Deployment_Verification_System SHALL validate all RPC responses against expected TypeScript types
6. IF RPC response does not match expected type, THEN THE Deployment_Verification_System SHALL throw typed validation error
7. THE Deployment_Verification_System SHALL export all type definitions for use in other frontend modules

### Requirement 7: Environment Variable Validation

**User Story:** As a developer, I want the verification system to validate environment variables, so that missing or invalid configuration is detected at startup rather than runtime

#### Acceptance Criteria

1. WHEN Deployment_Verification_System initializes, THE Deployment_Verification_System SHALL validate NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS is defined
2. THE Deployment_Verification_System SHALL validate NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS is valid Ethereum address format
3. THE Deployment_Verification_System SHALL validate NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS is not zero address
4. IF environment variable validation fails, THEN THE Deployment_Verification_System SHALL display Verification_Error_UI with missing variable name
5. THE Verification_Error_UI SHALL provide instructions for setting required environment variables
6. THE Deployment_Verification_System SHALL validate all required contract addresses during initialization
7. THE Deployment_Verification_System SHALL complete environment validation before attempting any RPC calls

### Requirement 8: Console Logging for Debugging

**User Story:** As a developer, I want verification results logged to the console, so that I can debug issues during development and monitor verification performance

#### Acceptance Criteria

1. WHEN Deployment_Verification_System begins verification, THE Deployment_Verification_System SHALL log timestamp and network information
2. WHEN each verification step completes successfully, THE Deployment_Verification_System SHALL log the step name and result
3. WHEN verification step fails, THE Deployment_Verification_System SHALL log error details including step name and error message
4. THE Deployment_Verification_System SHALL log RPC endpoint URL and contract addresses being verified
5. WHEN verification completes successfully, THE Deployment_Verification_System SHALL log total verification duration in milliseconds
6. THE Deployment_Verification_System SHALL log Contract_Data values retrieved during verification
7. WHERE NODE_ENV is development, THE Deployment_Verification_System SHALL log verbose debugging information
