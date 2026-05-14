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
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useChainId: vi.fn(),
  useSwitchChain: vi.fn(),
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
  const { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } = wagmi as any;

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

  useReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case 'nextFranchiseId':
        return { data: BigInt(2), isLoading: false };
      case 'getFranchiseInfo':
        return { data: franchiseInfo, isLoading: false, refetch: vi.fn() };
      case 'kycStatus':
        return { data: kycStatus, isLoading: false, refetch: vi.fn() };
      case 'demoModeActive':
        return { data: isDemoMode, isLoading: false };
      case 'allowance':
        return { data: allowance, isLoading: false, refetch: vi.fn() };
      case 'balanceOf':
        return { data: BigInt(0), isLoading: false };
      case 'currentCycleId':
        return { data: currentCycle, isLoading: false };
      case 'getPendingDividend':
        return { data: pendingDividend, isLoading: false, refetch: vi.fn() };
      case 'pendingDividendPool':
        return { data: BigInt(0), isLoading: false };
      case 'interval':
        return { data: BigInt(3600), isLoading: false };
      case 'getDividendCycleInfo':
        return { data: null, isLoading: false };
      default:
        return { data: undefined, isLoading: false };
    }
  });
}

// ─── Import component AFTER mocks are set up ──────────────────────────────────
import AccountAbstractionDemo from '../AccountAbstractionDemo';

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

      render(React.createElement(AccountAbstractionDemo));

      // The button should show "Comprar Fracción" when allowance is sufficient
      const investButton = screen.getByRole('button', { name: /comprar fracción/i });
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

      render(React.createElement(AccountAbstractionDemo));

      const investButton = screen.getByRole('button', { name: /comprar fracción/i });
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

      render(React.createElement(AccountAbstractionDemo));

      // With zero allowance, the button shows "Aprobar mUSDC"
      const approveButton = screen.getByRole('button', { name: /aprobar musdc/i });
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

      render(React.createElement(AccountAbstractionDemo));

      // The "Claim Rewards" button should be enabled (pendingDividend > 0)
      const claimButton = screen.getByRole('button', { name: /claim rewards/i });
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
   * the message shown should be "Error al procesar la inversión." (not the cancellation message).
   * This MUST PASS on fixed code — confirms baseline error handling behavior is preserved.
   */
  describe('2.4 — Preservation: Generic error not confused with user rejection', () => {
    it('should show "Error al procesar la inversión." for generic errors (not UserRejectedRequestError)', async () => {
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

      render(React.createElement(AccountAbstractionDemo));

      const investButton = screen.getByRole('button', { name: /comprar fracción/i });
      await act(async () => {
        fireEvent.click(investButton);
      });

      // ASSERT: Generic error message is shown (not the cancellation message)
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error al procesar la inversión/i);
        expect(errorMessage).not.toBeNull();
      });

      // ASSERT: Cancellation message is NOT shown
      const cancelMessage = screen.queryByText(/transacción cancelada por el usuario/i);
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

      render(React.createElement(AccountAbstractionDemo));

      // With KYC not verified and demo mode inactive, the button shows "Verificar Identidad"
      // or similar — it should not trigger writeContract
      // The button may show "Verificar Identidad" or "Error: KYC requerido"
      // We look for any invest-related button that is present
      const investButton = screen.getByRole('button', { name: /verificar identidad|kyc requerido|comprar fracción|aprobar musdc/i });
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

      render(React.createElement(AccountAbstractionDemo));

      // ASSERT: Some KYC-related text is visible in the UI
      // The component shows "* Se requiere verificación KYC para participar en activos RWA."
      // or the button label changes to "Verificar Identidad"
      const kycIndicator = screen.queryByText(/kyc/i);
      expect(kycIndicator).not.toBeNull();
    });
  });
});
