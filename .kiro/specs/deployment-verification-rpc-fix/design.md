# Design Document: Deployment Verification System

## Overview

The Deployment Verification System is a critical pre-flight check mechanism that executes before any application UI renders, ensuring that all smart contracts are properly deployed, accessible, and returning valid data. This system prevents users from encountering broken states due to RPC configuration issues, contract deployment problems, or network connectivity failures.

The system implements a verify-first architecture where the entire application remains in a loading state until all contract endpoints have been successfully validated. If verification fails, detailed diagnostic information is presented to help developers quickly identify and resolve deployment issues.

## Architecture

### High-Level Flow

```
Application Entry Point
    ↓
Environment Validation (sync)
    ↓
Deployment Verification (async)
    ├─→ Loading State (displayed)
    ├─→ Contract Connectivity Check
    ├─→ Data Retrieval & Validation
    ├─→ Retry Logic (on failure)
    └─→ Terminal State
        ├─→ Success: Render Application UI
        └─→ Failure: Render Verification Error UI
```

### Component Hierarchy

```
<DeploymentVerificationProvider>
  ├─ <VerificationLoadingScreen />  (while verifying)
  ├─ <VerificationErrorScreen />    (on failure)
  └─ <Application />                (on success)
```

### Module Structure

```
frontend/app/verification/
├── DeploymentVerificationProvider.tsx    # Root provider component
├── VerificationLoadingScreen.tsx         # Loading state UI
├── VerificationErrorScreen.tsx           # Error state UI with diagnostics
├── verificationService.ts                # Core verification logic
├── types.ts                              # TypeScript interfaces and types
├── validation.ts                         # Type guards and validators
├── errors.ts                             # Typed error classes
└── config.ts                             # Environment variable validation
```

## Core Components

### 1. DeploymentVerificationProvider

**Purpose:** Root-level provider component that orchestrates the verification process and manages verification state.

**Responsibilities:**
- Execute verification on mount before rendering children
- Manage verification state (loading, success, error)
- Render appropriate UI based on verification state
- Provide verification context to child components

**State:**
```typescript
interface VerificationState {
  status: 'loading' | 'success' | 'error';
  data: ContractData | null;
  error: VerificationError | null;
  startTime: number;
  endTime: number | null;
}
```

**Behavior:**
- On mount, immediately display loading screen
- Execute environment validation (sync)
- Execute contract verification (async)
- Update state based on verification results
- Only render `children` (Application UI) when status is 'success'

**Props:**
```typescript
interface DeploymentVerificationProviderProps {
  children: React.ReactNode;
}
```

### 2. VerificationLoadingScreen

**Purpose:** Display loading state with progress indicator during verification.

**Visual Design (Nova Design System):**
- Center-aligned layout with vertical stacking
- Glassmorphic card container:
  - Background: `rgba(255, 255, 255, 0.8)`
  - Border: `1px solid rgba(255, 255, 255, 0.47)`
  - Border radius: `24px` (radius-lg)
  - Padding: `48px` (space-12)
  - Shadow: `rgba(104, 155, 251, 0.2) 0px 16px 48px 0px` (Premium)
  - Backdrop filter: `blur(10px)`
- Animated spinner/progress indicator in primary blue (`#0000F5`)
- Heading: "Verifying Deployment" (Heading 1: 28px, weight 700)
- Subtext: "Connecting to Base Sepolia and validating contracts..." (Body Regular: 14px, `#CCCCCC`)
- Spacing: `24px` gap between elements

**Accessibility:**
- `role="status"` on container
- `aria-live="polite"` for screen reader updates
- `aria-label` on spinner

**Behavior:**
- Display immediately on verification start (within 100ms)
- No interactive elements or navigation
- Smooth fade-in animation (200ms ease-out)
- Persist until verification completes or fails

### 3. VerificationErrorScreen

**Purpose:** Display detailed diagnostic information when verification fails, with manual retry capability.

**Visual Design (Nova Design System):**
- Center-aligned layout with vertical stacking
- Error card:
  - Background: `#FFFFFF`
  - Border: `1px solid #E5E5E5`
  - Border radius: `24px` (radius-lg)
  - Padding: `48px` (space-12)
  - Shadow: `rgba(15, 23, 42, 0.11) 0px 14px 40px 0px` (Base)
- Error icon in error red (`#DC2626`)
- Heading: "Deployment Verification Failed" (Heading 1: 28px, weight 700)
- Error message in neutral-900 (`#0A0A0A`)
- Diagnostic details in collapsible accordion:
  - Contract address
  - Network name and chain ID
  - RPC endpoint
  - Error message from blockchain client
  - ABI method signature
  - Timestamp
- Actionable suggestions list:
  - Each suggestion with bullet point
  - Body Regular (14px) text
- Retry button (Primary CTA style):
  - Background: `#0000F5`
  - Text: "Retry Verification"
  - Full button specs from design system

**Content Structure:**
```typescript
interface ErrorScreenContent {
  title: string;
  message: string;
  diagnostics: {
    contractAddress: string;
    networkName: string;
    chainId: number;
    rpcEndpoint: string;
    errorMessage: string;
    methodSignature: string;
    timestamp: string;
  };
  suggestions: string[];
}
```

**Behavior:**
- Display when verification status is 'error'
- Log full error details to console in development mode
- Retry button calls verification service again
- Smooth fade-in animation (200ms ease-out)

### 4. verificationService

**Purpose:** Core service module that performs all verification logic with retry handling.

**Public API:**
```typescript
export async function verifyDeployment(): Promise<VerificationResult>;
export function createVerificationError(
  step: VerificationStep,
  cause: unknown,
  context: ErrorContext
): VerificationError;
```

**Verification Steps (sequential execution):**

1. **Environment Validation** (sync)
   - Validate `NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS` is defined
   - Validate address format matches Ethereum address pattern
   - Validate address is not zero address
   - Validate all required contract addresses
   - Throw `EnvironmentValidationError` on failure

2. **Network Connectivity** (async)
   - Create viem public client for Base Sepolia (chain ID 84532)
   - Attempt to fetch chain ID from RPC endpoint
   - Verify chain ID matches expected value (84532)
   - Implement retry logic with exponential backoff on network errors
   - Throw `NetworkConnectionError` on failure after retries

3. **Contract Existence** (async)
   - Call `getCode()` on FranchiseTokenizer contract address
   - Verify bytecode is non-empty (contract is deployed)
   - Throw `ContractNotDeployedError` if no code at address

4. **Contract Data Retrieval** (async)
   - Call `nextFranchiseId()` on FranchiseTokenizer contract
   - Validate response is bigint type
   - If `nextFranchiseId > 1`, call `getFranchiseInfo(1)`
   - Validate franchise data structure
   - Implement retry logic with exponential backoff on RPC errors
   - Throw `ContractDataError` on validation failure

5. **Data Validation** (sync)
   - Use type guards to validate all retrieved data
   - Verify data matches TypeScript interfaces
   - Throw `DataValidationError` on type mismatch

**Retry Logic:**
```typescript
interface RetryConfig {
  maxAttempts: 3;
  delays: [2000, 4000, 8000]; // milliseconds
  retryableErrors: ['NETWORK_TIMEOUT', 'CONNECTION_REFUSED', 'RPC_ERROR'];
}
```

**Retry Behavior:**
- Only retry on transient network errors
- Do not retry on validation errors or contract not deployed errors
- Use exponential backoff: 2s, 4s, 8s
- Log each retry attempt with attempt number
- After 3 failures, throw final error

**Logging:**
```typescript
// Log on verification start
console.log('[Verification] Starting deployment verification', {
  timestamp: Date.now(),
  network: 'Base Sepolia',
  chainId: 84532,
  contracts: { franchiseTokenizer: address }
});

// Log each step completion
console.log('[Verification] Step completed', {
  step: 'network-connectivity',
  duration: 123,
  result: 'success'
});

// Log on verification success
console.log('[Verification] Deployment verified successfully', {
  duration: 1234,
  data: contractData
});

// Log on verification error
console.error('[Verification] Step failed', {
  step: 'contract-data-retrieval',
  error: error.message,
  context: errorContext
});

// Verbose logging in development
if (process.env.NODE_ENV === 'development') {
  console.debug('[Verification] Detailed state', verboseData);
}
```

### 5. Type System

**Core Interfaces:**

```typescript
// Contract data structure
export interface ContractData {
  franchiseTokenizerAddress: Address;
  nextFranchiseId: bigint;
  franchiseInfo: FranchiseInfo | null;
  networkChainId: number;
  rpcEndpoint: string;
}

export interface FranchiseInfo {
  name: string;
  symbol: string;
  totalValue: bigint;
  maxSupply: bigint;
  currentSupply: bigint;
  isActive: boolean;
  realWorldManager: Address;
}

// Verification result types
export type VerificationResult = 
  | { success: true; data: ContractData; duration: number }
  | { success: false; error: VerificationError; duration: number };

export enum VerificationStep {
  EnvironmentValidation = 'environment-validation',
  NetworkConnectivity = 'network-connectivity',
  ContractExistence = 'contract-existence',
  ContractDataRetrieval = 'contract-data-retrieval',
  DataValidation = 'data-validation'
}

// Error context for diagnostics
export interface ErrorContext {
  step: VerificationStep;
  contractAddress?: Address;
  networkName?: string;
  chainId?: number;
  rpcEndpoint?: string;
  methodSignature?: string;
  timestamp: string;
}
```

**Type Guards:**

```typescript
// Validate ContractData structure
export function isContractData(data: unknown): data is ContractData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  
  return (
    typeof d.franchiseTokenizerAddress === 'string' &&
    isAddress(d.franchiseTokenizerAddress) &&
    typeof d.nextFranchiseId === 'bigint' &&
    typeof d.networkChainId === 'number' &&
    typeof d.rpcEndpoint === 'string' &&
    (d.franchiseInfo === null || isFranchiseInfo(d.franchiseInfo))
  );
}

// Validate FranchiseInfo structure
export function isFranchiseInfo(data: unknown): data is FranchiseInfo {
  if (typeof data !== 'object' || data === null) return false;
  const f = data as Record<string, unknown>;
  
  return (
    typeof f.name === 'string' &&
    typeof f.symbol === 'string' &&
    typeof f.totalValue === 'bigint' &&
    typeof f.maxSupply === 'bigint' &&
    typeof f.currentSupply === 'bigint' &&
    typeof f.isActive === 'boolean' &&
    typeof f.realWorldManager === 'string' &&
    isAddress(f.realWorldManager)
  );
}

// Validate Ethereum address format
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

// Validate not zero address
export function isNotZeroAddress(address: string): boolean {
  return address !== '0x0000000000000000000000000000000000000000';
}
```

### 6. Error Classes

**Hierarchy:**

```typescript
// Base error class
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly step: VerificationStep,
    public readonly context: ErrorContext,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'VerificationError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      step: this.step,
      context: this.context,
      cause: this.cause
    };
  }
}

// Environment validation errors
export class EnvironmentValidationError extends VerificationError {
  constructor(
    message: string,
    public readonly missingVariable?: string,
    context: ErrorContext
  ) {
    super(message, VerificationStep.EnvironmentValidation, context);
    this.name = 'EnvironmentValidationError';
  }

  getSuggestions(): string[] {
    return [
      `Ensure ${this.missingVariable || 'required environment variables'} are set in your .env.local file`,
      'Verify the address format is correct (0x followed by 40 hex characters)',
      'Restart the development server after changing environment variables',
      'Check the deployment documentation for required configuration'
    ];
  }
}

// Network connection errors
export class NetworkConnectionError extends VerificationError {
  constructor(
    message: string,
    public readonly attemptedRetries: number,
    context: ErrorContext,
    cause?: unknown
  ) {
    super(message, VerificationStep.NetworkConnectivity, context, cause);
    this.name = 'NetworkConnectionError';
  }

  getSuggestions(): string[] {
    return [
      'Check your internet connection',
      'Verify the RPC endpoint URL is correct and accessible',
      'Confirm Base Sepolia testnet is operational',
      'Try using a different RPC provider (Alchemy, Infura, or public endpoint)',
      'Check if your firewall is blocking the RPC endpoint'
    ];
  }
}

// Contract not deployed errors
export class ContractNotDeployedError extends VerificationError {
  constructor(
    message: string,
    context: ErrorContext
  ) {
    super(message, VerificationStep.ContractExistence, context);
    this.name = 'ContractNotDeployedError';
  }

  getSuggestions(): string[] {
    return [
      'Deploy the FranchiseTokenizer contract to Base Sepolia',
      'Verify the contract address in your environment variables matches the deployed contract',
      'Check the deployment transaction on Base Sepolia block explorer',
      'Ensure you are connecting to the correct network (Base Sepolia, chain ID 84532)'
    ];
  }
}

// Contract data retrieval errors
export class ContractDataError extends VerificationError {
  constructor(
    message: string,
    public readonly method: string,
    context: ErrorContext,
    cause?: unknown
  ) {
    super(message, VerificationStep.ContractDataRetrieval, context, cause);
    this.name = 'ContractDataError';
  }

  getSuggestions(): string[] {
    return [
      `Verify the ${this.method} function exists in the deployed contract`,
      'Check if the contract ABI matches the deployed contract',
      'Ensure the contract is not paused or in an invalid state',
      'Try calling the contract method directly using a block explorer',
      'Verify the contract has been initialized properly'
    ];
  }
}

// Data validation errors
export class DataValidationError extends VerificationError {
  constructor(
    message: string,
    public readonly expectedType: string,
    public readonly receivedType: string,
    context: ErrorContext
  ) {
    super(message, VerificationStep.DataValidation, context);
    this.name = 'DataValidationError';
  }

  getSuggestions(): string[] {
    return [
      `Expected data type: ${this.expectedType}, but received: ${this.receivedType}`,
      'Verify the contract ABI is up to date',
      'Check if the contract has been upgraded or modified',
      'Ensure the frontend types match the contract interface'
    ];
  }
}
```

### 7. Configuration Module

**Purpose:** Validate and export environment variables with type safety.

```typescript
// config.ts

import { Address } from 'viem';

export class ConfigurationError extends Error {
  constructor(message: string, public readonly variable: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function requireEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigurationError(
      `Missing required environment variable: ${key}`,
      key
    );
  }
  return value;
}

function requireAddress(key: string): Address {
  const value = requireEnvVar(key);
  
  if (!isValidEthereumAddress(value)) {
    throw new ConfigurationError(
      `Invalid Ethereum address format for ${key}: ${value}`,
      key
    );
  }
  
  if (!isNotZeroAddress(value)) {
    throw new ConfigurationError(
      `Address cannot be zero address for ${key}`,
      key
    );
  }
  
  return value as Address;
}

// Validate and export contract addresses
export const VERIFIED_CONTRACT_ADDRESSES = {
  franchiseTokenizer: requireAddress('NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS'),
  complianceManager: requireAddress('NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS'),
  dividendDistributor: requireAddress('NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS'),
  musdc: requireAddress('NEXT_PUBLIC_MUSDC_ADDRESS')
};

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_NAME = 'Base Sepolia';
```

## Integration Points

### 1. Application Entry Point

Modify `app/layout.tsx` or root component to wrap the application with `DeploymentVerificationProvider`:

```typescript
// app/layout.tsx
import { DeploymentVerificationProvider } from './verification/DeploymentVerificationProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DeploymentVerificationProvider>
          {/* Application renders only after successful verification */}
          {children}
        </DeploymentVerificationProvider>
      </body>
    </html>
  );
}
```

### 2. Viem Public Client

Create viem public client for Base Sepolia with automatic RPC configuration:

```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export function createBaseSepoliaClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http() // Uses default RPC from chain config or env
  });
}
```

### 3. Contract ABI Integration

Use existing `FRANCHISE_ABI` from `app/config/contracts.ts`:

```typescript
import { FRANCHISE_ABI, FRANCHISE_TOKENIZER_ADDRESS } from '@/app/config/contracts';

const data = await client.readContract({
  address: FRANCHISE_TOKENIZER_ADDRESS,
  abi: FRANCHISE_ABI,
  functionName: 'nextFranchiseId'
});
```

## Data Flow

### Success Path

```
1. User navigates to application
   ↓
2. DeploymentVerificationProvider mounts
   ↓
3. VerificationLoadingScreen renders immediately
   ↓
4. Environment validation executes (sync)
   ├─ Validate all contract addresses
   ├─ Validate address formats
   └─ All checks pass ✓
   ↓
5. verifyDeployment() executes (async)
   ↓
6. Network connectivity check
   ├─ Create viem client
   ├─ Fetch chain ID
   └─ Verify chain ID = 84532 ✓
   ↓
7. Contract existence check
   ├─ Call getCode() on contract address
   └─ Verify bytecode exists ✓
   ↓
8. Contract data retrieval
   ├─ Call nextFranchiseId()
   ├─ Validate response is bigint ✓
   ├─ If nextFranchiseId > 1:
   │   ├─ Call getFranchiseInfo(1)
   │   └─ Validate franchise data ✓
   └─ Log contract data
   ↓
9. Data validation
   ├─ Run type guards on all data
   └─ All validations pass ✓
   ↓
10. Update state to 'success'
    ↓
11. VerificationLoadingScreen unmounts
    ↓
12. Application UI renders
```

### Failure Path (with Retry)

```
1. User navigates to application
   ↓
2. DeploymentVerificationProvider mounts
   ↓
3. VerificationLoadingScreen renders immediately
   ↓
4. Environment validation passes ✓
   ↓
5. Network connectivity check
   ├─ Attempt 1: Network timeout ✗
   ├─ Wait 2 seconds
   ├─ Attempt 2: Network timeout ✗
   ├─ Wait 4 seconds
   ├─ Attempt 3: Network timeout ✗
   ├─ Wait 8 seconds
   └─ All retries exhausted ✗
   ↓
6. Create NetworkConnectionError
   ├─ Capture error context
   ├─ Generate suggestions
   └─ Log error details
   ↓
7. Update state to 'error'
   ↓
8. VerificationLoadingScreen unmounts
   ↓
9. VerificationErrorScreen renders
   ├─ Display error message
   ├─ Show diagnostics
   ├─ Show suggestions
   └─ Show retry button
   ↓
10. User clicks retry button
    ↓
11. Restart verification from step 3
```

## Error Handling Strategy

### Error Categories

1. **Configuration Errors** (fail fast, no retry)
   - Missing environment variables
   - Invalid address formats
   - Zero addresses
   - Action: Display error with configuration instructions

2. **Network Errors** (retry with backoff)
   - Timeout
   - Connection refused
   - DNS resolution failure
   - Action: Retry up to 3 times, then display error

3. **Contract Errors** (fail fast, no retry)
   - Contract not deployed (no bytecode)
   - Contract method not found
   - Contract reverted
   - Action: Display error with deployment instructions

4. **Validation Errors** (fail fast, no retry)
   - Type mismatch
   - Invalid data structure
   - Missing required fields
   - Action: Display error with type information

### Error Context Capture

Every error must capture:
- Step where error occurred
- Contract address (if applicable)
- Network information (name, chain ID)
- RPC endpoint
- Method signature (if applicable)
- Original error message
- Timestamp

### Error Display Priority

1. **Primary message**: User-friendly description of what went wrong
2. **Diagnostic details**: Technical information (collapsed by default)
3. **Actionable suggestions**: Numbered list of steps to resolve
4. **Retry capability**: Button to restart verification

## Performance Considerations

### Optimization Strategies

1. **Parallel Validation**: Environment validation is synchronous and executes before async network calls
2. **Sequential RPC Calls**: Network checks execute sequentially to minimize unnecessary calls if early steps fail
3. **Timeout Configuration**: Each RPC call has a 10-second timeout to prevent indefinite hanging
4. **Retry Backoff**: Exponential backoff prevents overwhelming the RPC endpoint
5. **Early Exit**: Fail fast on non-retryable errors to minimize user wait time

### Expected Performance

- **Success path**: 1-2 seconds total verification time
- **Network retry path**: 2s + 4s + 8s = 14 seconds maximum before error
- **Configuration error**: <100ms (immediate)
- **Contract not deployed**: 1-2 seconds (single RPC call)

### Performance Monitoring

Log verification duration in all cases:

```typescript
const startTime = Date.now();
// ... verification logic
const duration = Date.now() - startTime;
console.log('[Verification] Duration:', duration, 'ms');
```

## Security Considerations

### Input Validation

1. **Environment Variables**: All environment variables are validated before use
2. **RPC Responses**: All RPC responses are validated against TypeScript types
3. **Address Validation**: All addresses validated against Ethereum address format and zero address check

### Error Information Disclosure

1. **Production Mode**: Limit error details to prevent leaking sensitive configuration
2. **Development Mode**: Full error details and verbose logging for debugging
3. **Never expose**: Private keys, API keys, or sensitive credentials in errors

### RPC Endpoint Security

1. **HTTPS Only**: Enforce HTTPS for RPC endpoints
2. **Trusted Providers**: Document recommended RPC providers (Alchemy, Infura)
3. **Rate Limiting**: Respect RPC provider rate limits with retry backoff

## Testing Strategy

### Unit Tests

- Type guards validate correct and incorrect data structures
- Error classes construct properly with all context
- Configuration module validates environment variables
- Retry logic executes correct number of times with correct delays
- Error suggestions are generated for each error type

### Integration Tests

- Successful verification path with mocked viem client
- Network error triggers retry logic
- Contract not deployed detected correctly
- Invalid data structure triggers validation error
- Manual retry button restarts verification

### Component Tests

- VerificationLoadingScreen renders with correct design system styles
- VerificationErrorScreen displays all diagnostic information
- Retry button calls verification function
- Application UI only renders after successful verification

### End-to-End Tests

- Full verification flow with real testnet
- Verification with intentionally wrong contract address
- Verification with network disconnected
- Verification recovery after fixing configuration

## Deployment Checklist

Before deploying to production:

1. ✅ All environment variables are set in production environment
2. ✅ Contract addresses are verified on Base Sepolia block explorer
3. ✅ RPC endpoint is configured and accessible
4. ✅ Error messages are production-appropriate (no sensitive data)
5. ✅ Logging is configured for production monitoring
6. ✅ Design system styles are correctly applied
7. ✅ All tests pass
8. ✅ Performance is acceptable (<2s for success path)

## Future Enhancements

1. **Health Check Endpoint**: API endpoint that exposes verification status for monitoring
2. **Metrics Collection**: Track verification success/failure rates and durations
3. **Progressive Enhancement**: Cache successful verification results with TTL
4. **Multi-Chain Support**: Extend verification to support multiple networks
5. **WebSocket Fallback**: Use WebSocket transport if HTTP RPC fails
6. **Service Worker**: Perform verification in service worker for faster subsequent loads

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Verification precedes UI rendering

*For any* application load, the Application_UI SHALL NOT be mounted or rendered until the Deployment_Verification_System completes successfully with status 'success'.

**Validates: Requirements 1.1, 1.6, 1.7**

### Property 2: Loading state visibility during verification

*For any* verification execution, the Loading_State SHALL remain visible from verification start until a terminal state (success or error) is reached.

**Validates: Requirements 1.2, 4.2, 4.5**

### Property 3: Type validation for RPC responses

*For any* RPC response received during verification, the response SHALL be validated against the expected TypeScript type, and if the type does not match, a DataValidationError SHALL be thrown.

**Validates: Requirements 6.5, 6.6, 3.5**

### Property 4: Error context completeness

*For any* verification error, the error object SHALL contain contract address, network name, chain ID, RPC endpoint, error message, and timestamp in the error context.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: Retry behavior for network errors

*For any* RPC call that fails with a retryable network error, the system SHALL retry the call exactly 3 times with delays of 2s, 4s, and 8s respectively before final failure.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Environment variable validation

*For any* contract address environment variable, the value SHALL be validated to be non-empty, match Ethereum address format (0x followed by 40 hex characters), and not equal to the zero address, or an EnvironmentValidationError SHALL be thrown.

**Validates: Requirements 7.1, 7.2, 7.3, 3.1**

### Property 7: Error suggestions provided

*For any* verification error of any type, the error object SHALL provide a non-empty array of actionable suggestions for resolving the failure.

**Validates: Requirements 2.6, 7.5**

### Property 8: Sequential verification step execution

*For any* verification execution, the validation steps SHALL execute in the exact order: environment validation, network connectivity, contract existence, contract data retrieval, data validation.

**Validates: Requirements 3.7, 7.7**

### Property 9: Logging on verification events

*For any* verification execution, the system SHALL log the verification start with timestamp and network information, SHALL log each successful step completion with step name, and SHALL log errors with step name and error message.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 10: Error UI display on verification failure

*For any* verification failure (after all retries exhausted), the Verification_Error_UI SHALL be displayed with the specific failure reason and diagnostic information.

**Validates: Requirements 1.5, 3.6, 5.6**

### Property 11: Type guard correctness

*For any* input data passed to a type guard function (isContractData, isFranchiseInfo, isValidEthereumAddress), the type guard SHALL return true if and only if the data matches the expected type structure.

**Validates: Requirements 6.3**

### Property 12: Development mode verbose logging

*For any* verification execution where NODE_ENV is 'development', the system SHALL emit verbose debugging information to the console including detailed state and all intermediate values.

**Validates: Requirements 2.7, 8.7**

