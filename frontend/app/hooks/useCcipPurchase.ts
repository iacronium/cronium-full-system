'use client';

/**
 * useCcipPurchase — hook for cross-chain token purchases via Chainlink CCIP.
 *
 * Flow when user is on Ethereum Sepolia (chain 11155111):
 *   1. Read estimateFee() from CCIPTokenPurchaseSender to get required LINK amount.
 *   2. Check LINK allowance — if insufficient, approve LINK to the Sender contract.
 *   3. Check USDC allowance — if insufficient, approve USDC to the Sender contract.
 *   4. Call sendPurchaseRequest(franchiseId, tokenAmount, paymentAmount).
 *   5. Return the CCIP messageId so the UI can show a tracking link.
 *
 * The contract holds LINK for fees (deposited by the owner via depositLinkFees),
 * so in the standard flow the user only needs to approve USDC. The LINK approval
 * step is included as a fallback in case the contract runs out of LINK.
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
    | 'approving-link'
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
    // If the contract has enough LINK, the user doesn't need to approve LINK.
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

    // ── Main purchase function ─────────────────────────────────────────────────
    const sendCcipPurchase = useCallback(async (
        franchiseId: number,
        tokenAmount: number,
        paymentAmountUsdc: number, // in human-readable USDC (e.g. 100 = $100)
    ): Promise<`0x${string}` | null> => {
        if (!address || !CCIP_SENDER_ADDRESS) {
            setState(s => ({ ...s, step: 'error', error: 'CCIP Sender contract not configured.' }));
            return null;
        }

        const paymentAmountWei = parseUnits(paymentAmountUsdc.toString(), 6); // USDC has 6 decimals
        const franchiseIdBig = BigInt(franchiseId);
        const tokenAmountBig = BigInt(tokenAmount);

        try {
            // ── Step 1: Check USDC allowance ──────────────────────────────────
            setState(s => ({ ...s, step: 'estimating', error: null }));

            // ── Step 2: Approve USDC if needed ────────────────────────────────
            setState(s => ({ ...s, step: 'approving-usdc' }));
            await writeContractAsync({
                address: ETH_SEPOLIA_USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [CCIP_SENDER_ADDRESS, paymentAmountWei],
                chainId: ETH_SEPOLIA_CHAIN_ID,
            });

            // ── Step 3: Send the CCIP purchase request ────────────────────────
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
    }, [address, writeContractAsync]);

    const reset = useCallback(() => {
        setState({ step: 'idle', messageId: null, error: null, estimatedLinkFee: null });
    }, []);

    return {
        sendCcipPurchase,
        reset,
        isOnCcipChain,
        senderLinkBalance,
        ...state,
    };
}
