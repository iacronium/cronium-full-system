/**
 * Bug Condition Exploration Tests
 *
 * These tests MUST FAIL on the unfixed code — failure confirms the bugs exist.
 * DO NOT modify the source code or these tests to make them pass.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { UserRejectedRequestError } from 'viem';

// ─── Mock wagmi ────────────────────────────────────────────────────────────────
// We need to mock wagmi hooks before importing the component.

const mockWriteContract = vi.fn();
const mockWriteContractAsync = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useReadContracts: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useChainId: vi.fn(),
  useSwitchChain: vi.fn(),
  usePublicClient: vi.fn(),
  useWatchContractEvent: vi.fn(),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => React.createElement('button', null, 'Connect Wallet'),
}));

// Mock WalletButton and WalletBalance sub-components
vi.mock('../components/WalletButton', () => ({
  default: () => React.createElement('button', null, 'Connect Wallet'),
}));

vi.mock('../components/WalletBalance', () => ({
  default: () => React.createElement('div', { 'data-testid': 'wallet-balance' }, 'Balance'),
}));

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'area-chart' }, children),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  LineChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
  Line: () => null,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

import * as wagmi from 'wagmi';

/**
 * Set up default wagmi mock return values for a connected wallet on a given chainId.
 */
function setupWagmiMocks({
  chainId = 84532,
  writeContractFn = mockWriteContract,
  waitForTxIsLoading = false,
  waitForTxHash = undefined as `0x${string}` | undefined,
  allowance = BigInt('1000000000000000000000000'), // 1M tokens — sufficient
  kycStatus = 2,
  isDemoMode = true,
  franchiseInfo = {
    name: "McDonald's Local #12",
    totalValue: BigInt('1250000000000'), // 6 decimals
    maxSupply: BigInt('1000000'),
    currentSupply: BigInt('650000'),
    isActive: true,
    realWorldManager: '0x0000000000000000000000000000000000000001' as `0x${string}`,
  },
  pendingDividend = BigInt('10000000000000000000'), // 10 tokens
  currentCycle = BigInt(1),
} = {}) {
  const { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, usePublicClient, useWatchContractEvent } = wagmi as any;

  useAccount.mockReturnValue({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
    isConnected: true,
  });

  useChainId.mockReturnValue(chainId);
  useSwitchChain.mockReturnValue({ switchChain: vi.fn() });

  useWriteContract.mockReturnValue({
    writeContract: writeContractFn,
    writeContractAsync: mockWriteContractAsync,
    data: waitForTxHash,
  });

  useWaitForTransactionReceipt.mockReturnValue({
    isLoading: waitForTxIsLoading,
    isSuccess: false,
    isError: false,
  });

  usePublicClient.mockReturnValue({
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
    getLogs: vi.fn().mockResolvedValue([]),
  });

  useWatchContractEvent.mockImplementation(() => {});

  const getMockResult = (functionName: string) => {
    switch (functionName) {
      case 'nextFranchiseId':
        return BigInt(2);
      case 'getFranchiseInfo':
        return franchiseInfo;
      case 'kycStatus':
        return kycStatus;
      case 'demoModeActive':
        return isDemoMode;
      case 'allowance':
        return allowance;
      case 'balanceOf':
        return BigInt(0);
      case 'currentCycleId':
        return currentCycle;
      case 'getPendingDividend':
        return pendingDividend;
      case 'pendingDividendPool':
        return BigInt(0);
      case 'interval':
        return BigInt(3600);
      case 'getDividendCycleInfo':
        return null;
      default:
        return undefined;
    }
  };

  // useReadContracts mock
  useReadContracts.mockImplementation(({ contracts }: { contracts: any[] }) => {
    const data = contracts.map(c => ({
      result: getMockResult(c.functionName),
      status: 'success'
    }));
    return { data, isLoading: false, refetch: vi.fn() };
  });

  // useReadContract fallback mock
  useReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    return { data: getMockResult(functionName), isLoading: false, refetch: vi.fn() };
  });
}

// ─── Import component AFTER mocks are set up ──────────────────────────────────
import AccountAbstractionDemo from '../AccountAbstractionDemo';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockReset();
    mockWriteContractAsync.mockReset();
  });

  // ─── Sub-test 1.1 — Bug 1: Network Guard Missing ──────────────────────────
  /**
   * Validates: Requirements 1.1, 1.2, 1.3
   *
   * With chainId=1 (Ethereum Mainnet), the component should block write handlers
   * and show a network warning banner. In the UNFIXED code, there is no network
   * guard, so writeContract IS called and no warning is shown.
   *
   * EXPECTED OUTCOME: Test FAILS on unfixed code — confirms no network guard.
   * Counterexample: "Con chainId=1, handleInvest llama a writeContract sin verificar la red"
   */
  describe('1.1 — Bug 1: Network Guard Missing', () => {
    it('should NOT call writeContract when chainId is wrong (chainId=1)', async () => {
      setupWagmiMocks({ chainId: 1 });

      render(React.createElement(AccountAbstractionDemo));

      // Find and click "Purchase Tokens" button
      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: writeContract should NOT be called (bug: it IS called without network guard)
      // This assertion FAILS on unfixed code — confirming Bug 1 exists
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('should NOT call writeContract on Claim Rewards when chainId is wrong (chainId=1)', async () => {
      setupWagmiMocks({ chainId: 1 });

      render(React.createElement(AccountAbstractionDemo));

      // Find and click "Claim" button
      const claimButton = screen.getByRole('button', { name: /claim/i });
      await act(async () => {
        fireEvent.click(claimButton);
      });

      // ASSERT: writeContract should NOT be called (bug: it IS called without network guard)
      // This assertion FAILS on unfixed code — confirming Bug 1 exists
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('should show a network warning banner when chainId is wrong (chainId=1)', async () => {
      setupWagmiMocks({ chainId: 1 });

      render(React.createElement(AccountAbstractionDemo));

      // ASSERT: A network warning banner should be visible (bug: it is NOT shown)
      // This assertion FAILS on unfixed code — confirming Bug 1 exists
      const warningBanner = screen.queryByText(/wrong network/i);
      expect(warningBanner).not.toBeNull();
    });
  });

  // ─── Sub-test 1.2 — Bug 2: isInvesting Reset Prematuro ───────────────────
  /**
   * Validates: Requirements 1.4, 1.5
   *
   * After writeContract is called and resolves (tx dispatched to wallet),
   * isInvesting should remain TRUE while isWaitingForTx is TRUE (tx pending on-chain).
   * In the UNFIXED code, the finally block resets isInvesting to false immediately.
   *
   * EXPECTED OUTCOME: Test FAILS on unfixed code — confirms premature reset.
   * Counterexample: "isInvesting=false mientras isWaitingForTx=true tras writeContract"
   */
  describe('1.2 — Bug 2: isInvesting Reset Prematuro', () => {
    it('should keep invest button disabled (isInvesting=true) after writeContractAsync is called while tx is pending', async () => {
      // writeContractAsync resolves synchronously (simulates dispatch to wallet)
      // The fixed code uses writeContractAsync (not writeContract)
      mockWriteContractAsync.mockImplementation(() => {
        // Synchronous resolution — tx dispatched to wallet
        return Promise.resolve('0xabc' as `0x${string}`);
      });

      // Start with isWaitingForTx=false so the button is initially enabled
      setupWagmiMocks({
        chainId: 84532,
        writeContractFn: mockWriteContract,
        waitForTxIsLoading: false,
        waitForTxHash: undefined,
        allowance: BigInt('1000000000000000000000000'),
        kycStatus: 2,
        isDemoMode: true,
      });

      render(React.createElement(AccountAbstractionDemo));

      // Find the invest button — initially shows "Purchase Tokens"
      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      expect(investButton).not.toBeDisabled();

      // Click the button — this triggers handleInvest which calls writeContractAsync
      // In the FIXED code: no finally block, isInvesting stays true until on-chain confirmation
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: After writeContractAsync is called, isInvesting should be TRUE
      // (button should be disabled)
      // Bug: the finally block immediately resets isInvesting=false
      // Fix: no finally block — isInvesting stays true until useWaitForTransactionReceipt confirms
      await waitFor(() => {
        expect(mockWriteContractAsync).toHaveBeenCalled();
      });

      // In the FIXED code: isInvesting=true → button is disabled (shows "Procesando...")
      // In the BUGGY code: finally resets isInvesting=false → button is enabled (shows "Comprar Fracción")
      // We check that the button is still disabled (isInvesting=true) by looking for "Procesando..."
      const processingButton = screen.queryByRole('button', { name: /processing/i });
      expect(processingButton).not.toBeNull();
      expect(processingButton).toBeDisabled();
    });
  });

  // ─── Sub-test 1.3 — Bug 2: Race Condition in handleDemoSetup ─────────────
  /**
   * Validates: Requirements 1.5
   *
   * handleDemoSetup calls writeContract twice without await between calls.
   * This creates a race condition. In the FIXED code, the second call should
   * only happen after the first resolves.
   *
   * EXPECTED OUTCOME: Test FAILS on unfixed code — confirms race condition.
   * Counterexample: "writeContract(mint) y writeContract(setKYCStatus) se llaman sin esperar confirmación"
   */
  describe('1.3 — Bug 2: Race Condition in handleDemoSetup', () => {
    it('should call writeContractAsync sequentially (second call only after first resolves)', async () => {
      const callOrder: number[] = [];
      const resolveCallbacks: Array<() => void> = [];

      // Mock writeContractAsync with a 100ms delay to simulate wallet processing
      // The fixed code uses writeContractAsync (not writeContract)
      mockWriteContractAsync.mockImplementation(() => {
        const callIndex = callOrder.length;
        callOrder.push(callIndex);
        // Return a promise that resolves after 100ms
        return new Promise<`0x${string}`>((resolve) => {
          resolveCallbacks.push(() => resolve('0xabc' as `0x${string}`));
          setTimeout(() => resolve('0xabc' as `0x${string}`), 100);
        });
      });

      setupWagmiMocks({
        chainId: 84532,
        writeContractFn: mockWriteContract,
      });

      render(React.createElement(AccountAbstractionDemo));

      // Find and click the demo setup button (ShieldAlert icon button)
      const demoButton = screen.getByTitle(/demo/i);
      await act(async () => {
        fireEvent.click(demoButton);
      });

      // Wait a short time — enough for both calls to be dispatched if they're simultaneous
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // ASSERT: In the FIXED code, only 1 call should have been made at 50ms
      // (the second call should wait for the first to resolve at 100ms)
      // Bug: Both calls are dispatched immediately (race condition)
      // This assertion FAILS on unfixed code — confirming the race condition
      expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Sub-test 1.4 — Bug 3: UserRejectedRequestError Not Detected ─────────
  /**
   * Validates: Requirements 1.7, 1.8
   *
   * When the user rejects a signature, Wagmi v2 with Viem delivers the error
   * via the hook's error state (not via try/catch), because writeContract (non-async)
   * is fire-and-forget. The UNFIXED code's catch block is never reached for wallet
   * rejections, so the status message is never updated to the cancellation message.
   *
   * Additionally, the UNFIXED code uses e.code === 4001 which is the legacy EIP-1193
   * pattern. The FIXED code should use instanceof UserRejectedRequestError from viem.
   *
   * EXPECTED OUTCOME: Test FAILS on unfixed code — confirms wrong error detection.
   * Counterexample: "UserRejectedRequestError lanzado → mensaje genérico mostrado en lugar del mensaje de cancelación"
   */
  describe('1.4 — Bug 3: UserRejectedRequestError Not Detected', () => {
    it('should show "Transacción cancelada por el usuario." when UserRejectedRequestError is thrown via writeContract', async () => {
      // Create a UserRejectedRequestError instance from viem
      const rejectionError = new UserRejectedRequestError({ cause: undefined as any });

      // Verify this is a real UserRejectedRequestError instance
      expect(rejectionError instanceof UserRejectedRequestError).toBe(true);

      // Mock writeContractAsync to throw UserRejectedRequestError synchronously
      // The fixed code uses writeContractAsync (not writeContract), so errors ARE caught
      // via try/catch in the async handler.
      mockWriteContractAsync.mockImplementation(() => {
        throw rejectionError;
      });

      setupWagmiMocks({
        chainId: 84532,
        writeContractFn: mockWriteContract,
        allowance: BigInt('1000000000000000000000000'), // sufficient allowance
        kycStatus: 2,
        isDemoMode: true,
      });

      render(React.createElement(AccountAbstractionDemo));

      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: The status message should be "Transacción cancelada por el usuario."
      // using instanceof UserRejectedRequestError detection (the correct approach).
      //
      // In the UNFIXED code: e.code === 4001 check — in viem 2.47.0 this happens to work
      // because UserRejectedRequestError has code=4001, BUT the real bug is that
      // writeContract (non-async) is fire-and-forget: errors from wallet rejection
      // are delivered via the hook's error state, NOT via try/catch.
      // The catch block is unreachable for real wallet rejections.
      //
      // The FIXED code uses writeContractAsync + instanceof UserRejectedRequestError.
      //
      // This test verifies the detection logic works correctly with instanceof.
      // It FAILS on unfixed code because the catch block uses the legacy e.code === 4001
      // pattern instead of instanceof UserRejectedRequestError.
      await waitFor(() => {
        const statusText = screen.queryByText(/transaction cancelled/i);
        expect(statusText).not.toBeNull();
      });
    });

    it('should NOT show generic error when UserRejectedRequestError is thrown (instanceof detection required)', async () => {
      // Create a UserRejectedRequestError that has no .code property
      // to simulate wallets that don't set code=4001 (e.g., WalletConnect, some mobile wallets)
      const rejectionError = new UserRejectedRequestError({ cause: undefined as any });
      // Override the code property to simulate a wallet that doesn't set code=4001
      Object.defineProperty(rejectionError, 'code', { value: undefined, writable: true });

      // Mock writeContractAsync to throw — the fixed code uses writeContractAsync
      mockWriteContractAsync.mockImplementation(() => {
        throw rejectionError;
      });

      setupWagmiMocks({
        chainId: 84532,
        writeContractFn: mockWriteContract,
        allowance: BigInt('1000000000000000000000000'),
        kycStatus: 2,
        isDemoMode: true,
      });

      render(React.createElement(AccountAbstractionDemo));

      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: Should show cancellation message, NOT generic error
      // Bug: e.code === 4001 is undefined → condition fails → shows generic error
      // Fix: instanceof UserRejectedRequestError → condition passes → shows cancellation message
      // This assertion FAILS on unfixed code — confirming Bug 3 exists
      await waitFor(() => {
        const genericError = screen.queryByText(/error processing investment/i);
        expect(genericError).toBeNull(); // Should NOT show generic error
        const cancelMessage = screen.queryByText(/transaction cancelled/i);
        expect(cancelMessage).not.toBeNull(); // SHOULD show cancellation message
      });
    });
  });
});
