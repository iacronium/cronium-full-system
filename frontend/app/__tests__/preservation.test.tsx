/**
 * Preservation Property Tests
 *
 * These tests document the CORRECT behavior that already works on the UNFIXED code.
 * They MUST PASS on the unfixed code — passing confirms the baseline behavior.
 * After the fix is applied, these tests must STILL PASS (no regressions).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { parseUnits } from 'viem';

// ─── Mock wagmi ────────────────────────────────────────────────────────────────

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

vi.mock('../components/WalletButton', () => ({
  default: () => React.createElement('button', null, 'Connect Wallet'),
}));

vi.mock('../components/WalletBalance', () => ({
  default: () => React.createElement('div', { 'data-testid': 'wallet-balance' }, 'Balance'),
}));

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
 * Mirrors the pattern from bugConditions.test.tsx.
 */
function setupWagmiMocks({
  chainId = 84532,
  writeContractFn = mockWriteContract,
  waitForTxIsLoading = false,
  waitForTxHash = undefined as `0x${string}` | undefined,
  allowance = parseUnits('1000000', 18), // 1M tokens — sufficient by default
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
  pendingDividend = parseUnits('10', 18), // 10 tokens
  currentCycle = BigInt(1),
  isConnected = true,
  address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
} = {}) {
  const { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, usePublicClient, useWatchContractEvent } = wagmi as any;

  useAccount.mockReturnValue({
    address,
    isConnected,
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

  useWatchContractEvent.mockImplementation(() => { });

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
import AccountAbstraction from '../AccountAbstraction';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockReset();
    mockWriteContractAsync.mockReset();
  });

  // ─── Sub-test 2.1 — Preservation: Investment flow with sufficient allowance ──
  /**
   * **Validates: Requirements 3.1**
   *
   * With chainId=84532 and sufficient allowance, clicking "Comprar Fracción"
   * should call writeContractAsync with functionName: 'purchaseTokens'.
   * This MUST PASS on fixed code — confirms baseline behavior is preserved.
   */
  describe('2.1 — Preservation: Investment flow with sufficient allowance', () => {
    it('should call writeContractAsync with purchaseTokens when allowance is sufficient (chainId=84532)', async () => {
      setupWagmiMocks({
        chainId: 84532,
        allowance: parseUnits('1000000', 18), // 1M — sufficient
        kycStatus: 2,
        isDemoMode: true,
      });

      render(React.createElement(AccountAbstraction));

      // The button should show "Purchase Tokens" when allowance is sufficient
      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: writeContractAsync is called with purchaseTokens
      await waitFor(() => {
        expect(mockWriteContractAsync).toHaveBeenCalled();
      });

      const callArgs = mockWriteContractAsync.mock.calls[0][0];
      expect(callArgs.functionName).toBe('purchaseTokens');
    });

    it('should call writeContractAsync with correct args (franchiseId, purchaseQuantity, totalPrice)', async () => {
      const franchiseInfo = {
        name: "McDonald's Local #12",
        totalValue: BigInt('1250000000000'), // 6 decimals
        maxSupply: BigInt('1000000'),
        currentSupply: BigInt('650000'),
        isActive: true,
        realWorldManager: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      };

      setupWagmiMocks({
        chainId: 84532,
        allowance: parseUnits('1000000', 18),
        kycStatus: 2,
        isDemoMode: true,
        franchiseInfo,
      });

      render(React.createElement(AccountAbstraction));

      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      await waitFor(() => {
        expect(mockWriteContractAsync).toHaveBeenCalled();
      });

      const callArgs = mockWriteContractAsync.mock.calls[0][0];
      expect(callArgs.functionName).toBe('purchaseTokens');

      // Args: [franchiseId, purchaseQuantity, totalPrice]
      // Default purchaseQuantity is '100', franchiseId is 1
      const [franchiseId, purchaseQuantity, totalPrice] = callArgs.args;
      expect(franchiseId).toBe(BigInt(1));
      expect(purchaseQuantity).toBe(BigInt(100));
      // totalPrice = (totalValue * 1e12 * quantity) / maxSupply
      // = (1250000000000 * 1e12 * 100) / 1000000 = 125000000000000000000 (125 * 1e18)
      const expectedTotalPrice = (BigInt('1250000000000') * BigInt(1e12) * BigInt(100)) / BigInt('1000000');
      expect(totalPrice).toBe(expectedTotalPrice);
    });
  });

  // ─── Sub-test 2.2 — Preservation: Approve flow when allowance is insufficient ─
  /**
   * **Validates: Requirements 3.2**
   *
   * With chainId=84532 and allowance=0, clicking "Aprobar mUSDC"
   * should call writeContractAsync with functionName: 'approve' (not 'purchaseTokens').
   * This MUST PASS on fixed code — confirms baseline behavior is preserved.
   */
  describe('2.2 — Preservation: Approve flow when allowance is insufficient', () => {
    it('should call writeContractAsync with approve (not purchaseTokens) when allowance is 0 (chainId=84532)', async () => {
      setupWagmiMocks({
        chainId: 84532,
        allowance: BigInt(0), // insufficient
        kycStatus: 2,
        isDemoMode: true,
      });

      render(React.createElement(AccountAbstraction));

      // With zero allowance, clicking the button triggers approval
      const approveButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(approveButton);
      });

      // ASSERT: writeContractAsync is called with 'approve', not 'purchaseTokens'
      await waitFor(() => {
        expect(mockWriteContractAsync).toHaveBeenCalled();
      });

      const callArgs = mockWriteContractAsync.mock.calls[0][0];
      expect(callArgs.functionName).toBe('approve');
      expect(callArgs.functionName).not.toBe('purchaseTokens');
    });
  });

  // ─── Sub-test 2.3 — Preservation: Dividend claim flow ────────────────────────
  /**
   * **Validates: Requirements 3.3**
   *
   * With chainId=84532 and pending dividends, clicking "Claim Rewards"
   * should call writeContractAsync with functionName: 'claimDividend'.
   * This MUST PASS on fixed code — confirms baseline behavior is preserved.
   */
  describe('2.3 — Preservation: Dividend claim flow', () => {
    it('should call writeContractAsync with claimDividend when there are pending dividends (chainId=84532)', async () => {
      setupWagmiMocks({
        chainId: 84532,
        pendingDividend: parseUnits('10', 18), // 10 tokens — non-zero
        currentCycle: BigInt(1),
      });

      render(React.createElement(AccountAbstraction));

      // The Claim button should be enabled (pendingDividend > 0)
      const claimButton = screen.getByRole('button', { name: /claim/i });
      expect(claimButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(claimButton);
      });

      // ASSERT: writeContractAsync is called with claimDividend
      await waitFor(() => {
        expect(mockWriteContractAsync).toHaveBeenCalled();
      });

      const callArgs = mockWriteContractAsync.mock.calls[0][0];
      expect(callArgs.functionName).toBe('claimDividend');
    });
  });

  // ─── Sub-test 2.4 — Preservation: Generic error not confused with user rejection
  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * When writeContractAsync throws a generic Error (not UserRejectedRequestError),
   * the message shown should be "Error processing investment." (not the cancellation message).
   * This MUST PASS on fixed code — confirms baseline error handling behavior is preserved.
   */
  describe('2.4 — Preservation: Generic error not confused with user rejection', () => {
    it('should show "Error processing investment." for generic errors (not UserRejectedRequestError)', async () => {
      // Mock writeContractAsync to throw a generic error
      const genericError = new Error('Network error');
      mockWriteContractAsync.mockImplementation(() => {
        throw genericError;
      });

      setupWagmiMocks({
        chainId: 84532,
        allowance: parseUnits('1000000', 18), // sufficient
        kycStatus: 2,
        isDemoMode: true,
        writeContractFn: mockWriteContract,
      });

      render(React.createElement(AccountAbstraction));

      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: Generic error message is shown (not the cancellation message)
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error processing investment/i);
        expect(errorMessage).not.toBeNull();
      });

      // ASSERT: Cancellation message is NOT shown
      const cancelMessage = screen.queryByText(/transaction cancelled/i);
      expect(cancelMessage).toBeNull();
    });
  });

  // ─── Sub-test 2.5 — Preservation: KYC blocked when demo mode inactive ─────────
  /**
   * **Validates: Requirements 3.6**
   *
   * With chainId=84532, isDemoMode=false, and kycStatus=0 (not verified),
   * clicking the invest button should NOT call writeContract.
   * The UI should indicate KYC is required.
   * This MUST PASS on unfixed code — confirms baseline KYC guard behavior.
   */
  describe('2.5 — Preservation: KYC blocked when demo mode inactive', () => {
    it('should NOT call writeContract when demo mode is inactive and KYC is not verified', async () => {
      setupWagmiMocks({
        chainId: 84532,
        isDemoMode: false,
        kycStatus: 0, // not verified
        allowance: parseUnits('1000000', 18),
      });

      render(React.createElement(AccountAbstraction));

      // With KYC not verified and demo mode inactive, the button should still be clicked
      // but it will fail KYC checks instead of triggering writeContract
      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: writeContract is NOT called
      expect(mockWriteContract).not.toHaveBeenCalled();
      expect(mockWriteContractAsync).not.toHaveBeenCalled();
    });

    it('should show KYC-related message or indicator when demo mode is inactive and KYC is not verified', async () => {
      setupWagmiMocks({
        chainId: 84532,
        isDemoMode: false,
        kycStatus: 0, // not verified
        allowance: parseUnits('1000000', 18),
      });

      render(React.createElement(AccountAbstraction));

      // Click the invest button to trigger the KYC error status message
      const investButton = screen.getByRole('button', { name: /purchase tokens/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: Some KYC-related text is visible in the UI
      const kycIndicator = screen.queryByText(/kyc/i);
      expect(kycIndicator).not.toBeNull();
    });
  });
});
