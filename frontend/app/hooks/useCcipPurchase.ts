'use client';

/**
 * useCcipPurchase — hook for cross-chain token purchases via Chainlink CCIP.
 *
 * Flow when user is on Ethereum Sepolia (chain 11155111):
 *   1. Read current USDC allowance for the Sender contract.
 *   2. If allowance < paymentAmount, approve USDC to the Sender contract.
 *   3. Call sendPurchaseRequest(franchiseId, tokenAmount, paymentAmount).
 *   4. Return the tx hash so the UI can show a tracking link.
 *
 * The contract holds LINK for fees (deposited by the owner via depositLinkFees),
 * so the user only needs to approve USDC. The allowance check avoids an unnecessary
 * on-chain approval transaction when the user has already approved enough.
 */

import { useState, useCallback } from 'react';
import { useWriteContract, useReadContract, useAccount, useChainId } from 'wagmi';
import { parseUnits, UserRejectedRequestError } from 'viem';
import {
    CCIP_SENDER_ADDRESS,
    CCIP_SENDER_ABI,
    ETH_SEPOLIA_USDC_ADDRESS,
    ETH_SEPOLIA_LINK_ADDRESS,
    ERC20_ABI,
} from '../config/contracts';

export const ETH_SEPOLIA_CHAIN_ID = 11155111;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export type CcipPurchaseStep =
    | 'idle'
    | 'estimating'
    | 'approving-usdc'
    | 'sending'
    | 'success'
    | 'error';

export interface CcipPurchaseState {
    step: CcipPurchaseStep;
    messageId: `0x${string}` | null;
    error: string | null;
    estimatedLinkFee: bigint | null;
}

export function useCcipPurchase() {
    const { address } = useAccount();
    const chainId = useChainId();
    const { writeContractAsync } = useWriteContract();

    const [state, setState] = useState<CcipPurchaseState>({
        step: 'idle',
        messageId: null,
        error: null,
        estimatedLinkFee: null,
    });

    const isOnCcipChain = chainId === ETH_SEPOLIA_CHAIN_ID;

    // ── Read LINK balance of the Sender contract (owner pre-funds it) ──────────
    const { data: senderLinkBalance } = useReadContract({
        address: ETH_SEPOLIA_LINK_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [CCIP_SENDER_ADDRESS],
        query: {
            enabled: isOnCcipChain && !!CCIP_SENDER_ADDRESS,
            staleTime: 1000 * 30,
        },
        chainId: ETH_SEPOLIA_CHAIN_ID,
    });

    // ── Read current USDC allowance for the Sender contract ───────────────────
    // Used to skip the approve tx when the user already has sufficient allowance.
    const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
        address: ETH_SEPOLIA_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address ?? '0x0000000000000000000000000000000000000000', CCIP_SENDER_ADDRESS],
        query: {
            enabled: isOnCcipChain && !!address && !!CCIP_SENDER_ADDRESS && !!ETH_SEPOLIA_USDC_ADDRESS,
            staleTime: 1000 * 15, // 15s — allowance can change between purchases
        },
        chainId: ETH_SEPOLIA_CHAIN_ID,
    });

    // ── Main purchase function ─────────────────────────────────────────────────
    const sendCcipPurchase = useCallback(async (
        franchiseId: number,
        tokenAmount: number,
        paymentAmountUsdc: number, // human-readable USDC (e.g. 100 = $100)
    ): Promise<`0x${string}` | null> => {
        if (!address || !CCIP_SENDER_ADDRESS) {
            setState(s => ({ ...s, step: 'error', error: 'CCIP Sender contract not configured.' }));
            return null;
        }

        const paymentAmountWei = parseUnits(paymentAmountUsdc.toString(), 18); // mUSDC uses 18 decimals
        const franchiseIdBig = BigInt(franchiseId);
        const tokenAmountBig = BigInt(tokenAmount);

        try {
            setState(s => ({ ...s, step: 'estimating', error: null }));

            // ── Step 1: Approve USDC only if current allowance is insufficient ─
            // Fetch the latest allowance right before the purchase to avoid stale data.
            const { data: freshAllowance } = await refetchAllowance();
            const currentAllowance = (freshAllowance as bigint | undefined) ?? BigInt(0);

            if (currentAllowance < paymentAmountWei) {
                setState(s => ({ ...s, step: 'approving-usdc' }));
                await writeContractAsync({
                    address: ETH_SEPOLIA_USDC_ADDRESS,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [CCIP_SENDER_ADDRESS, paymentAmountWei],
                    chainId: ETH_SEPOLIA_CHAIN_ID,
                });
            }

            // ── Step 2: Send the CCIP purchase request ────────────────────────
            setState(s => ({ ...s, step: 'sending' }));
            const txHash = await writeContractAsync({
                address: CCIP_SENDER_ADDRESS,
                abi: CCIP_SENDER_ABI,
                functionName: 'sendPurchaseRequest',
                args: [franchiseIdBig, tokenAmountBig, paymentAmountWei],
                chainId: ETH_SEPOLIA_CHAIN_ID,
            });

            setState(s => ({
                ...s,
                step: 'success',
                messageId: txHash, // tx hash — CCIP messageId is in the event log
            }));

            return txHash;

        } catch (error: unknown) {
            if (error instanceof UserRejectedRequestError) {
                setState(s => ({ ...s, step: 'idle', error: null }));
            } else {
                const msg = error instanceof Error ? error.message : 'Transaction failed.';
                setState(s => ({ ...s, step: 'error', error: msg }));
            }
            return null;
        }
    }, [address, writeContractAsync, refetchAllowance]);

    const reset = useCallback(() => {
        setState({ step: 'idle', messageId: null, error: null, estimatedLinkFee: null });
    }, []);

    return {
        sendCcipPurchase,
        reset,
        isOnCcipChain,
        senderLinkBalance,
        usdcAllowance,
        ...state,
    };
}
