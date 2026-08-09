# Implementation Plan: Deployment Verification System

## Overview

This implementation creates a deployment verification system that executes before any application UI renders, validating contract deployment and RPC connectivity. The system prevents users from encountering broken states by verifying contract accessibility and data integrity first.

The implementation follows a verify-first architecture where the entire application remains in a loading state until all contract endpoints are validated. If verification fails, detailed diagnostic information helps developers identify and resolve issues quickly.

## Tasks

- [ ] 1. Set up verification module structure and core types
  - Create `frontend/app/verification/` directory
  - Define TypeScript interfaces for verification data structures
  - Define type guards and validation functions
  - Define error classes hierarchy
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

- [ ] 2. Implement environment configuration validation
  - [ ] 2.1 Create configuration module with environment variable validation
    - Implement `config.ts` with `requireEnvVar` and `requireAddress` functions
    - Validate contract addresses format (Ethereum address pattern)
    - Validate addresses are not zero address
    - Export `VERIFIED_CONTRACT_ADDRESSES` and network constants
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7_

  - [ ]* 2.2 Write unit tests for configuration validation
    - Test missing environment variables throw errors
    - Test invalid address formats are rejected
    - Test zero address validation
    - Test successful validation returns correct addresses
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 3. Implement core verification service
  - [ ] 3.1 Create verification service with retry logic
    - Implement `verificationService.ts` with `verifyDeployment` function
    - Implement environment validation step (sync)
    - Implement network connectivity check with viem client
    - Implement contract existence check (getCode)
    - Implement contract data retrieval (nextFranchiseId, getFranchiseInfo)
    - Implement retry logic with exponential backoff (2s, 4s, 8s)
    - Add comprehensive logging for each verification step
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.7, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 3.2 Write property test for retry logic behavior
    - **Property 5: Retry behavior for network errors**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Test retry count is exactly 3 for network errors
    - Test delays are 2s, 4s, 8s between attempts
    - Test no retry for non-retryable errors

  - [ ]* 3.3 Write unit tests for verification service
    - Test successful verification path returns contract data
    - Test network error triggers retry logic
    - Test contract not deployed detected correctly
    - Test invalid data structure triggers validation error
    - Mock viem client for predictable test behavior
    - _Requirements: 1.3, 1.4, 3.3, 3.4, 5.6_

- [ ] 4. Checkpoint - Ensure service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement error handling and typed error classes
  - [ ] 5.1 Create error classes with context and suggestions
    - Implement `errors.ts` with base `VerificationError` class
    - Implement `EnvironmentValidationError` with suggestions
    - Implement `NetworkConnectionError` with retry context
    - Implement `ContractNotDeployedError` with deployment suggestions
    - Implement `ContractDataError` with method context
    - Implement `DataValidationError` with type information
    - Each error class includes `getSuggestions()` method
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.4, 7.5_

  - [ ]* 5.2 Write property test for error context completeness
    - **Property 4: Error context completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Test all error types include required context fields
    - Test error context includes contract address, network name, chain ID, RPC endpoint

  - [ ]* 5.3 Write property test for error suggestions
    - **Property 7: Error suggestions provided**
    - **Validates: Requirements 2.6, 7.5**
    - Test all error types return non-empty suggestions array

  - [ ]* 5.4 Write unit tests for error classes
    - Test each error type constructs with correct properties
    - Test `toJSON()` serialization includes all context
    - Test suggestions are actionable and specific
    - _Requirements: 2.6, 6.4, 7.5_

- [ ] 6. Implement type guards and validation utilities
  - [ ] 6.1 Create validation module with type guards
    - Implement `validation.ts` with type guard functions
    - Implement `isContractData` type guard
    - Implement `isFranchiseInfo` type guard
    - Implement `isValidEthereumAddress` validator
    - Implement `isNotZeroAddress` validator
    - _Requirements: 3.5, 6.3, 6.5, 7.2, 7.3_

  - [ ]* 6.2 Write property test for type guard correctness
    - **Property 11: Type guard correctness**
    - **Validates: Requirements 6.3**
    - Test type guards return true only for valid data structures
    - Test type guards return false for invalid structures
    - Generate random valid and invalid inputs

  - [ ]* 6.3 Write unit tests for type guards
    - Test `isContractData` validates all required fields
    - Test `isFranchiseInfo` validates franchise structure
    - Test address validators with valid and invalid addresses
    - _Requirements: 3.5, 6.3, 6.5, 6.6_

- [ ] 7. Implement VerificationLoadingScreen component
  - [ ] 7.1 Create loading screen with Nova design system styles
    - Implement `VerificationLoadingScreen.tsx` component
    - Apply glassmorphic card design with backdrop blur
    - Display animated spinner in primary blue
    - Display "Verifying Deployment" heading
    - Display subtext "Connecting to Base Sepolia and validating contracts..."
    - Apply proper spacing (24px gaps) and padding (48px)
    - Add accessibility attributes (`role="status"`, `aria-live="polite"`)
    - Implement smooth fade-in animation (200ms ease-out)
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [ ]* 7.2 Write component tests for loading screen
    - Test component renders with correct design system styles
    - Test accessibility attributes are present
    - Test animation is applied
    - Use React Testing Library
    - _Requirements: 4.2, 4.4, 4.5_

- [ ] 8. Implement VerificationErrorScreen component
  - [ ] 8.1 Create error screen with diagnostic information
    - Implement `VerificationErrorScreen.tsx` component
    - Display error card with proper Nova styles
    - Display error icon in error red
    - Display "Deployment Verification Failed" heading
    - Display error message and diagnostic details
    - Implement collapsible accordion for diagnostics
    - Display actionable suggestions list
    - Add retry button with Primary CTA style
    - Log full error details to console in development mode
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.6, 5.6_

  - [ ]* 8.2 Write component tests for error screen
    - Test error screen displays all diagnostic information
    - Test retry button calls verification function
    - Test suggestions are displayed correctly
    - Test development mode logging
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

- [ ] 9. Checkpoint - Ensure UI component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement DeploymentVerificationProvider component
  - [ ] 10.1 Create provider component with state management
    - Implement `DeploymentVerificationProvider.tsx` root component
    - Define `VerificationState` interface (status, data, error, timestamps)
    - Execute verification on component mount
    - Manage verification state transitions (loading → success/error)
    - Render VerificationLoadingScreen during loading state
    - Render VerificationErrorScreen on error state
    - Render children (Application UI) only on success state
    - Implement retry functionality
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 3.6, 5.6, 5.7_

  - [ ]* 10.2 Write property test for UI rendering precondition
    - **Property 1: Verification precedes UI rendering**
    - **Validates: Requirements 1.1, 1.6, 1.7**
    - Test Application_UI never renders before verification succeeds
    - Test only success state renders children

  - [ ]* 10.3 Write property test for loading state visibility
    - **Property 2: Loading state visibility during verification**
    - **Validates: Requirements 1.2, 4.2, 4.5**
    - Test loading state is visible from start until terminal state

  - [ ]* 10.4 Write property test for sequential step execution
    - **Property 8: Sequential verification step execution**
    - **Validates: Requirements 3.7, 7.7**
    - Test verification steps execute in exact order

  - [ ]* 10.5 Write integration tests for provider
    - Test successful verification path renders application
    - Test network error displays error screen
    - Test manual retry button restarts verification
    - Mock verification service for predictable behavior
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 5.7_

- [ ] 11. Integrate DeploymentVerificationProvider into application
  - [ ] 11.1 Wire provider into Providers component
    - Modify `frontend/app/providers.tsx` to wrap children with `DeploymentVerificationProvider`
    - Ensure verification executes before wagmi/RainbowKit providers render children
    - Import verification provider and types
    - Test integration in development environment
    - _Requirements: 1.1, 1.6, 1.7_

  - [ ]* 11.2 Write end-to-end integration test
    - Test full verification flow with real testnet
    - Test verification with wrong contract address
    - Test application renders after successful verification
    - Use Playwright or Cypress for E2E testing
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 12. Add development mode verbose logging
  - [ ] 12.1 Implement comprehensive logging throughout verification
    - Add verbose logging in development mode (`NODE_ENV === 'development'`)
    - Log verification start with timestamp and network info
    - Log each step completion with duration
    - Log contract data values on success
    - Log detailed error context on failure
    - Ensure production logging is minimal and safe
    - _Requirements: 2.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 12.2 Write property test for logging behavior
    - **Property 9: Logging on verification events**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    - Test verification start logs timestamp and network info
    - Test step completion logs step name
    - Test errors log step name and message

  - [ ]* 12.3 Write property test for development mode logging
    - **Property 12: Development mode verbose logging**
    - **Validates: Requirements 2.7, 8.7**
    - Test verbose debugging only in development mode
    - Test production mode has minimal logging

- [ ] 13. Final checkpoint and testing
  - [ ] 13.1 Verify all acceptance criteria are met
    - Test successful verification path completes in <2 seconds
    - Test retry path with network timeouts
    - Test all error scenarios display correct diagnostics
    - Test environment variable validation catches misconfigurations
    - Verify Nova design system styles are correctly applied
    - Test accessibility with screen readers
    - _Requirements: All_

  - [ ] 13.2 Manual testing with real Base Sepolia testnet
    - Deploy test environment with correct configuration
    - Test with intentionally wrong contract address
    - Test with network disconnected
    - Test recovery after fixing configuration
    - Verify error messages are clear and actionable
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1-2.7_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Integration tests verify components work together correctly
- The verification system uses TypeScript for type safety throughout
- All UI components follow Nova design system specifications
- Error handling provides actionable diagnostics for quick resolution
- Retry logic handles transient network issues automatically
- Development mode logging aids debugging without exposing production data

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "5.2", "5.3", "5.4", "6.2", "6.3"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3"] },
    { "id": 5, "tasks": ["7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "8.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5"] },
    { "id": 9, "tasks": ["11.1", "12.1"] },
    { "id": 10, "tasks": ["11.2", "12.2", "12.3"] },
    { "id": 11, "tasks": ["13.1", "13.2"] }
  ]
}
```
