'use client';

/**
 * useTransactionFeed
 *
 * Provides a real-time feed of on-chain activity for the Cronium RWA platform.
 *
 * Strategy:
 *   1. On mount — fetch ALL historical TokensPurchased and DividendClaimed logs
 *      from the contract deployment block onward, with chunked fallback if the
 *      RPC limits the block range.
 *   2. Live — subscribe to new events via useWatchContractEvent.
 *   3. New live events are prepended; list is always newest-first.
 *   4. Feed is capped at MAX_ENTRIES.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { formatUnits } from 'viem';
import {
    COMPLIANCE_MANAGER_ADDRESS,
    DIVIDEND_DISTRIBUTOR_ADDRESS,
    COMPLIANCE_ABI,
    DIVIDEND_ABI,
} from '../config/contracts';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TxType = 'purchase' | 'dividend';

export interface TxEntry {
    id: string;
    type: TxType;
    buyer: string;
    franchiseId: number;
    amount: string;
    usdcValue: string;
    txHash: string;
    blockNumber: bigint;
    timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ENTRIES = 30;

// Approximate deployment block — scan from here to avoid scanning genesis.
// Set to 0n to scan all history (slower but complete).
const DEPLOY_FROM_BLOCK = BigInt(0);

// Max blocks per getLogs request — Alchemy allows up to 10,000
const CHUNK_SIZE = BigInt(10_000);

// Small delay between sequential chunks to avoid rate limiting
const CHUNK_DELAY_MS = 200;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function makeId(txHash: string, logIndex: number): string {
    return `${txHash}-${logIndex}`;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch logs sequentially in chunks with a small delay between each
async function getLogsChunked(
    publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
    params: any,
    fromBlock: bigint,
    toBlock: bigint,
): Promise<any[]> {
    const results: any[] = [];
    let current = fromBlock;

    while (current <= toBlock) {
        const end = current + CHUNK_SIZE - BigInt(1) < toBlock
            ? current + CHUNK_SIZE - BigInt(1)
            : toBlock;

        try {
            const chunk = await publicClient.getLogs({
                ...params,
                fromBlock: current,
                toBlock: end,
            } as any);
            results.push(...chunk);
        } catch (err) {
            console.warn('[useTransactionFeed] Chunk failed, skipping:', current, '-', end, err);
        }

        current = end + BigInt(1);
        if (current <= toBlock) await sleep(CHUNK_DELAY_MS);
    }

    return results;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTransactionFeed() {
    const publicClient = usePublicClient({ chainId: 84532 });
    const [entries, setEntries] = useState<TxEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const addEntries = useCallback((incoming: TxEntry[]) => {
        setEntries(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const fresh = incoming.filter(e => !existingIds.has(e.id));
            if (fresh.length === 0) return prev;
            return [...fresh, ...prev]
                .sort((a, b) => Number(b.blockNumber - a.blockNumber))
                .slice(0, MAX_ENTRIES);
        });
    }, []);

    // ── Historical backfill — full history ───────────────────────────────────
    useEffect(() => {
        if (!publicClient) return;

        let cancelled = false;

        async function fetchHistory() {
            if (!publicClient) return;
            setIsLoading(true);
            try {
                const latestBlock = await publicClient.getBlockNumber();
                // Scan last 500,000 blocks (~months of history on Base Sepolia)
                // to avoid scanning from genesis which would take too long
                const fromBlock = latestBlock > BigInt(500_000)
                    ? latestBlock - BigInt(500_000)
                    : DEPLOY_FROM_BLOCK;

                const purchaseEventDef = {
                    type: 'event' as const,
                    name: 'TokensPurchased',
                    inputs: [
                        { indexed: true,  name: 'buyer',         type: 'address' },
                        { indexed: true,  name: 'franchiseId',   type: 'uint256' },
                        { indexed: false, name: 'tokenAmount',   type: 'uint256' },
                        { indexed: false, name: 'paymentAmount', type: 'uint256' },
                        { indexed: false, name: 'pricePerToken', type: 'uint256' },
                    ],
                };

                const claimEventDef = {
                    type: 'event' as const,
                    name: 'DividendClaimed',
                    inputs: [
                        { indexed: true,  name: 'franchiseId', type: 'uint256' },
                        { indexed: true,  name: 'cycleId',     type: 'uint256' },
                        { indexed: true,  name: 'user',        type: 'address' },
                        { indexed: false, name: 'amount',      type: 'uint256' },
                    ],
                };

                // Sequential to avoid saturating the RPC
                const purchaseLogs = await getLogsChunked(
                    publicClient,
                    { address: COMPLIANCE_MANAGER_ADDRESS, event: purchaseEventDef },
                    fromBlock,
                    latestBlock,
                );

                if (cancelled) return;

                const claimLogs = await getLogsChunked(
                    publicClient,
                    { address: DIVIDEND_DISTRIBUTOR_ADDRESS, event: claimEventDef },
                    fromBlock,
                    latestBlock,
                );

                if (cancelled) return;

                const purchaseEntries: TxEntry[] = purchaseLogs.map(log => {
                    const { buyer, franchiseId, tokenAmount, paymentAmount } = (log as any).args as {
                        buyer: `0x${string}`;
                        franchiseId: bigint;
                        tokenAmount: bigint;
                        paymentAmount: bigint;
                    };
                    return {
                        id: makeId(log.transactionHash ?? '0x', log.logIndex ?? 0),
                        type: 'purchase',
                        buyer: shortAddr(buyer),
                        franchiseId: Number(franchiseId),
                        amount: tokenAmount.toLocaleString(),
                        usdcValue: Number(formatUnits(paymentAmount, 6)).toFixed(2),
                        txHash: log.transactionHash ?? '',
                        blockNumber: log.blockNumber ?? BigInt(0),
                        timestamp: 0,
                    };
                });

                const claimEntries: TxEntry[] = claimLogs.map(log => {
                    const { user, franchiseId, amount } = (log as any).args as {
                        user: `0x${string}`;
                        franchiseId: bigint;
                        amount: bigint;
                    };
                    return {
                        id: makeId(log.transactionHash ?? '0x', log.logIndex ?? 0),
                        type: 'dividend',
                        buyer: shortAddr(user),
                        franchiseId: Number(franchiseId),
                        amount: Number(formatUnits(amount, 6)).toFixed(4),
                        usdcValue: Number(formatUnits(amount, 6)).toFixed(4),
                        txHash: log.transactionHash ?? '',
                        blockNumber: log.blockNumber ?? BigInt(0),
                        timestamp: 0,
                    };
                });

                addEntries([...purchaseEntries, ...claimEntries]);
            } catch (err) {
                console.warn('[useTransactionFeed] History fetch failed:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void fetchHistory();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicClient]);

    // ── Live: TokensPurchased ────────────────────────────────────────────────
    useWatchContractEvent({
        address: COMPLIANCE_MANAGER_ADDRESS,
        abi: COMPLIANCE_ABI,
        chainId: 84532,
        eventName: 'TokensPurchased',
        onLogs(logs) {
            const fresh: TxEntry[] = logs.map(log => {
                const { buyer, franchiseId, tokenAmount, paymentAmount } = log.args as {
                    buyer: `0x${string}`;
                    franchiseId: bigint;
                    tokenAmount: bigint;
                    paymentAmount: bigint;
                };
                return {
                    id: makeId(log.transactionHash ?? '0x', log.logIndex),
                    type: 'purchase',
                    buyer: shortAddr(buyer),
                    franchiseId: Number(franchiseId),
                    amount: tokenAmount.toLocaleString(),
                    usdcValue: Number(formatUnits(paymentAmount, 6)).toFixed(2),
                    txHash: log.transactionHash ?? '',
                    blockNumber: log.blockNumber ?? BigInt(0),
                    timestamp: Math.floor(Date.now() / 1000),
                };
            });
            addEntries(fresh);
            setIsLoading(false);
        },
    });

    // ── Live: DividendClaimed ────────────────────────────────────────────────
    useWatchContractEvent({
        address: DIVIDEND_DISTRIBUTOR_ADDRESS,
        abi: DIVIDEND_ABI,
        chainId: 84532,
        eventName: 'DividendClaimed',
        onLogs(logs) {
            const fresh: TxEntry[] = logs.map(log => {
                const { user, franchiseId, amount } = log.args as {
                    user: `0x${string}`;
                    franchiseId: bigint;
                    amount: bigint;
                };
                return {
                    id: makeId(log.transactionHash ?? '0x', log.logIndex),
                    type: 'dividend',
                    buyer: shortAddr(user),
                    franchiseId: Number(franchiseId),
                    amount: Number(formatUnits(amount, 6)).toFixed(4),
                    usdcValue: Number(formatUnits(amount, 6)).toFixed(4),
                    txHash: log.transactionHash ?? '',
                    blockNumber: log.blockNumber ?? BigInt(0),
                    timestamp: Math.floor(Date.now() / 1000),
                };
            });
            addEntries(fresh);
            setIsLoading(false);
        },
    });

    return { entries, isLoading };
}
