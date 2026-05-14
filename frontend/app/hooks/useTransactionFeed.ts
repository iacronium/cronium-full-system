'use client';

/**
 * useTransactionFeed
 *
 * Provides a real-time feed of on-chain activity for the Cronium RWA platform.
 *
 * Strategy:
 *   1. On mount — fetch the last ~500 blocks of TokensPurchased and DividendClaimed
 *      logs via getLogs (historical backfill, max 20 entries).
 *   2. Live — subscribe to new TokensPurchased and DividendClaimed events via
 *      useWatchContractEvent (Wagmi v2 WebSocket/polling transport).
 *   3. New live events are prepended so the list is always newest-first.
 *   4. The feed is capped at MAX_ENTRIES to avoid unbounded growth.
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
    id: string;           // unique key: `${txHash}-${logIndex}`
    type: TxType;
    buyer: string;        // address (checksummed)
    franchiseId: number;
    amount: string;       // human-readable token count or USDC amount
    usdcValue: string;    // human-readable USDC (18 dec)
    txHash: string;
    blockNumber: bigint;
    timestamp: number;    // unix seconds (best-effort; 0 if unavailable)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ENTRIES = 20;
// How many blocks back to scan for historical logs (~500 blocks ≈ ~17 min on Base Sepolia)
const HISTORY_BLOCKS = BigInt(500);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function makeId(txHash: string, logIndex: number): string {
    return `${txHash}-${logIndex}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTransactionFeed() {
    const publicClient = usePublicClient();
    const [entries, setEntries] = useState<TxEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Prepend new entries, dedup by id, cap at MAX_ENTRIES
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

    // ── Historical backfill ──────────────────────────────────────────────────
    useEffect(() => {
        if (!publicClient) return;

        let cancelled = false;

        async function fetchHistory() {
            if (!publicClient) return;
            setIsLoading(true);
            try {
                const latestBlock = await publicClient.getBlockNumber();
                const fromBlock = latestBlock > HISTORY_BLOCKS
                    ? latestBlock - HISTORY_BLOCKS
                    : BigInt(0);

                // Fetch both event types in parallel
                const [purchaseLogs, claimLogs] = await Promise.all([
                    publicClient.getLogs({
                        address: COMPLIANCE_MANAGER_ADDRESS,
                        event: {
                            type: 'event',
                            name: 'TokensPurchased',
                            inputs: [
                                { indexed: true,  name: 'buyer',         type: 'address' },
                                { indexed: true,  name: 'franchiseId',   type: 'uint256' },
                                { indexed: false, name: 'tokenAmount',   type: 'uint256' },
                                { indexed: false, name: 'paymentAmount', type: 'uint256' },
                                { indexed: false, name: 'pricePerToken', type: 'uint256' },
                            ],
                        },
                        fromBlock,
                        toBlock: latestBlock,
                    }),
                    publicClient.getLogs({
                        address: DIVIDEND_DISTRIBUTOR_ADDRESS,
                        event: {
                            type: 'event',
                            name: 'DividendClaimed',
                            inputs: [
                                { indexed: true,  name: 'franchiseId', type: 'uint256' },
                                { indexed: true,  name: 'cycleId',     type: 'uint256' },
                                { indexed: true,  name: 'user',        type: 'address' },
                                { indexed: false, name: 'amount',      type: 'uint256' },
                            ],
                        },
                        fromBlock,
                        toBlock: latestBlock,
                    }),
                ]);

                if (cancelled) return;

                const purchaseEntries: TxEntry[] = purchaseLogs.map(log => {
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
                        usdcValue: Number(formatUnits(paymentAmount, 18)).toFixed(2),
                        txHash: log.transactionHash ?? '',
                        blockNumber: log.blockNumber ?? BigInt(0),
                        timestamp: 0,
                    };
                });

                const claimEntries: TxEntry[] = claimLogs.map(log => {
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
                        amount: Number(formatUnits(amount, 18)).toFixed(4),
                        usdcValue: Number(formatUnits(amount, 18)).toFixed(4),
                        txHash: log.transactionHash ?? '',
                        blockNumber: log.blockNumber ?? BigInt(0),
                        timestamp: 0,
                    };
                });

                addEntries([...purchaseEntries, ...claimEntries]);
            } catch (err) {
                // Non-fatal — live events will still populate the feed
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
                    usdcValue: Number(formatUnits(paymentAmount, 18)).toFixed(2),
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
                    amount: Number(formatUnits(amount, 18)).toFixed(4),
                    usdcValue: Number(formatUnits(amount, 18)).toFixed(4),
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
