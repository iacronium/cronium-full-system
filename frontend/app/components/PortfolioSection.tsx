'use client';

/**
 * PortfolioSection — "My Portfolio" dashboard for the Cronium RWA platform.
 * Banking-app-from-2050 aesthetic: glassmorphism, neon accents, live on-chain data.
 */

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { useEffect } from 'react';
import {
    Wallet, TrendingUp, HandCoins, UserCheck, ShieldCheck,
    BarChart2, Layers, Activity, ArrowUpRight, ExternalLink,
    RefreshCw, Coins,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    FRANCHISE_TOKENIZER_ADDRESS,
    COMPLIANCE_MANAGER_ADDRESS,
    DIVIDEND_DISTRIBUTOR_ADDRESS,
    MUSDC_ADDRESS,
    FRANCHISE_ABI,
    COMPLIANCE_ABI,
    DIVIDEND_ABI,
    MUSDC_ABI,
} from '../config/contracts';
import { useNavigation } from '../context/NavigationContext';
import { useTransactionFeed } from '../hooks/useTransactionFeed';

// ─── Mock vesting chart data ──────────────────────────────────────────────────

const vestingData = [
    { month: 'M1',  pct: 0 },
    { month: 'M6',  pct: 15 },
    { month: 'M12', pct: 30 },
    { month: 'M24', pct: 60 },
    { month: 'M36', pct: 100 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUSD(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ''}`} />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortfolioSection() {
    const { address } = useAccount();
    const { setActiveSection } = useNavigation();
    const { entries: txFeed } = useTransactionFeed();

    // ── Batch contract reads ─────────────────────────────────────────────────
    const { data: reads, isLoading, refetch } = useReadContracts({
        contracts: [
            // 0: kycStatus(address)
            {
                address: COMPLIANCE_MANAGER_ADDRESS,
                abi: COMPLIANCE_ABI,
                functionName: 'kycStatus',
                args: [address!],
            },
            // 1: balanceOf(address, 1) — ERC-1155 franchise #1
            {
                address: FRANCHISE_TOKENIZER_ADDRESS,
                abi: FRANCHISE_ABI,
                functionName: 'balanceOf',
                args: [address!, BigInt(1)],
            },
            // 2: getPendingDividend(address, 1)
            {
                address: DIVIDEND_DISTRIBUTOR_ADDRESS,
                abi: DIVIDEND_ABI,
                functionName: 'getPendingDividend',
                args: [address!, BigInt(1)],
            },
            // 3: balanceOf(address) — mUSDC
            {
                address: MUSDC_ADDRESS,
                abi: MUSDC_ABI,
                functionName: 'balanceOf',
                args: [address!],
            },
            // 4: currentCycleId(1)
            {
                address: DIVIDEND_DISTRIBUTOR_ADDRESS,
                abi: DIVIDEND_ABI,
                functionName: 'currentCycleId',
                args: [BigInt(1)],
            },
            // 5: demoModeActive — to show correct KYC badge
            {
                address: COMPLIANCE_MANAGER_ADDRESS,
                abi: COMPLIANCE_ABI,
                functionName: 'demoModeActive',
            },
            // 6: getFranchiseInfo(1) — for price calculation
            {
                address: FRANCHISE_TOKENIZER_ADDRESS,
                abi: FRANCHISE_ABI,
                functionName: 'getFranchiseInfo',
                args: [BigInt(1)],
            },
        ],
        query: {
            enabled: !!address,
            staleTime: 0,
            gcTime: 0,
            refetchOnMount: 'always',
        },
    });

    const kycStatus        = reads?.[0]?.result as number | undefined;
    const franchiseTokens  = reads?.[1]?.result as bigint | undefined;
    const pendingDividend  = reads?.[2]?.result as bigint | undefined;
    const musdcBalance     = reads?.[3]?.result as bigint | undefined;
    const currentCycleId   = reads?.[4]?.result as bigint | undefined;
    const isDemoMode       = reads?.[5]?.result as boolean | undefined;
    const franchiseInfo    = reads?.[6]?.result as { name: string; totalValue: bigint; maxSupply: bigint; currentSupply: bigint; isActive: boolean; realWorldManager: `0x${string}` } | undefined;

    // ── Claim dividends ──────────────────────────────────────────────────────
    const { writeContract, data: claimTxHash, isPending: isClaimPending } = useWriteContract();
    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
        hash: claimTxHash,
    });

    // Refetch after claim confirms
    useEffect(() => {
        if (isClaimSuccess) void refetch();
    }, [isClaimSuccess, refetch]);

    function handleClaim() {
        writeContract({
            address: DIVIDEND_DISTRIBUTOR_ADDRESS,
            abi: DIVIDEND_ABI,
            functionName: 'claimDividend',
            args: [BigInt(1)],
        });
    }

    // ── Derived values ───────────────────────────────────────────────────────
    const tokens        = franchiseTokens ?? BigInt(0);
    const tokensNum     = Number(tokens);
    // Price per token from on-chain data: totalValue(6 decimals) / maxSupply
    const pricePerToken = franchiseInfo
        ? Number(franchiseInfo.totalValue) / Number(franchiseInfo.maxSupply) / 1e6
        : 100; // fallback $100
    const maxSupplyNum  = franchiseInfo ? Number(franchiseInfo.maxSupply) : 1000;
    const portfolioUSD  = tokensNum * pricePerToken;
    const dividendHuman = pendingDividend ? Number(formatUnits(pendingDividend, 18)).toFixed(4) : '0.0000';
    const musdcHuman    = musdcBalance    ? Number(formatUnits(musdcBalance, 18)).toFixed(2)    : '0.00';
    const ownershipPct  = (tokensNum / maxSupplyNum * 100).toFixed(4);
    const ownershipBar  = Math.min(tokensNum / maxSupplyNum * 100, 100);
    const isKycVerified = kycStatus === 2;
    const noDividend    = !pendingDividend || pendingDividend === BigInt(0);

    // ── Not connected ────────────────────────────────────────────────────────
    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <Wallet size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Connect your wallet</h2>
                <p className="text-white/40 text-sm">Connect to view your portfolio dashboard.</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── A. Net Worth Banner ──────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl p-px">
                {/* Cyan gradient border top */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" />

                <div className="relative rounded-[calc(1rem-1px)] px-8 py-7" style={{
                    background: 'rgba(41, 53, 48, 0.4)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
                }}>
                    {/* Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-400/5 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                        {/* Left: Total Portfolio Value */}
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                                <BarChart2 size={11} className="text-emerald-400" />
                                Total Portfolio Value
                            </p>
                            {isLoading ? (
                                <Skeleton className="h-9 w-40" />
                            ) : (
                                <p className="text-4xl font-black text-white tracking-tight">
                                    {formatUSD(portfolioUSD)}
                                </p>
                            )}
                            <p className="text-[11px] text-white/30">
                                {isLoading ? '—' : `${tokensNum.toLocaleString()} franchise units × $125`}
                            </p>
                        </div>

                        {/* Center: Claimable Dividends */}
                        <div className="space-y-1 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 justify-center">
                                <HandCoins size={11} className="text-emerald-400" />
                                Claimable Dividends
                            </p>
                            {isLoading ? (
                                <Skeleton className="h-9 w-32 mx-auto" />
                            ) : (
                                <p className="text-4xl font-black text-emerald-400 tracking-tight">
                                    {dividendHuman}
                                    <span className="text-lg text-white/40 ml-1">mUSDC</span>
                                </p>
                            )}
                            <p className="text-[11px] text-white/30">mUSDC balance: {musdcHuman}</p>
                        </div>

                        {/* Right: Actions + KYC badge */}
                        <div className="flex flex-col items-end gap-3">
                            {/* KYC badge */}
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                                isKycVerified || isDemoMode
                                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                    : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                            }`}>
                                {isKycVerified
                                    ? <><ShieldCheck size={11} /> KYC Verified ✓</>
                                    : isDemoMode
                                        ? <><ShieldCheck size={11} /> Demo Mode ✓</>
                                        : <><UserCheck size={11} /> KYC Pending</>
                                }
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClaim}
                                    disabled={noDividend || isClaimPending || isClaimConfirming}
                                    className="px-5 py-2.5 bg-emerald-400 text-[#0a0a0a] font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-emerald-300 hover:shadow-[0_0_24px_rgba(16, 185, 129,0.5)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isClaimPending || isClaimConfirming ? (
                                        <><RefreshCw size={12} className="animate-spin" /> Claiming…</>
                                    ) : isClaimSuccess ? (
                                        <><Coins size={12} /> Claimed!</>
                                    ) : (
                                        <><HandCoins size={12} /> Claim Rewards</>
                                    )}
                                </button>
                                <button
                                    disabled
                                    className="px-5 py-2.5 bg-transparent text-white/50 font-black text-xs uppercase tracking-[0.15em] rounded-2xl border border-white/10 cursor-not-allowed opacity-50 flex items-center gap-2"
                                    title="Coming Soon"
                                >
                                    <TrendingUp size={12} /> Reinvest
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── B. My Fractional Assets ──────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-px bg-gradient-to-r from-emerald-400 to-transparent" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">My Fractional Assets</h3>
                </div>

                {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                ) : tokens > BigInt(0) ? (
                    /* Asset card with NFT fan */
                    <div className="group relative" style={{
                        background: 'rgba(41, 53, 48, 0.4)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        borderRadius: '20px',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.5s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(16, 185, 129, 0.12)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.3)';
                    }}
                    >
                        {/* Cyan border glow top */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                        {/* Glow orb */}
                        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Solidity code overlay on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                            <pre className="absolute bottom-4 right-6 text-[8px] leading-relaxed font-mono text-emerald-400/20 text-right">
                                {`mapping(uint256 => Franchise) public franchises;`}
                            </pre>
                        </div>

                        <div className="relative p-7 flex flex-col gap-5 overflow-visible">

                            {/* ── Info ── */}
                            <div className="w-full space-y-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                                            ERC-1155 · Franchise #1
                                        </span>
                                        <h4 className="text-xl font-black text-white mt-3">{franchiseInfo?.name || "McDonald's Local #12"}</h4>
                                        <p className="text-white/40 text-xs mt-1">Tokenized real-world franchise ownership</p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 h-fit">
                                        14.2% APY
                                    </span>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-12">
                                    <div>
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Your Balance</p>
                                        <p className="text-lg font-black text-white mt-0.5">{tokensNum.toLocaleString()} Units</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Ownership</p>
                                        <p className="text-lg font-black text-emerald-400 mt-0.5">{ownershipPct}%</p>
                                    </div>
                                </div>

                                {/* Ownership progress bar */}
                                <div className="space-y-1.5 pt-2">
                                    <div className="flex justify-between text-[9px] text-white/30 uppercase tracking-widest font-bold">
                                        <span>Ownership stake</span>
                                        <span>{ownershipPct}% of 1,000,000</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden w-full">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${ownershipBar}%`, background: '#0e7987' }}
                                        />
                                    </div>
                                </div>

                                {/* Contract address */}
                                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Contract:</span>
                                    <span className="text-[10px] font-mono text-white/50">{truncateAddr(FRANCHISE_TOKENIZER_ADDRESS)}</span>
                                    <a
                                        href={`https://sepolia.basescan.org/address/${FRANCHISE_TOKENIZER_ADDRESS}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors ml-auto"
                                    >
                                        View on BaseScan <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>

                            {/* ── NFT Fan ── */}
                            <div
                                className="nft-fan hidden md:block absolute right-12 top-[40%] -translate-y-1/2"
                                style={{ width: 90, height: 120, zIndex: 20 }}
                            >
                                {/* Card 1 — left, rotated -18deg */}
                                <div
                                    className="nft-card nft-card-left absolute inset-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                                    style={{
                                        transformOrigin: 'bottom center',
                                        transform: 'rotate(-18deg) translateX(-12px)',
                                        transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
                                        zIndex: 1,
                                    }}
                                >
                                    <img src="/nft-card.png" alt="NFT Card" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-emerald-400/10" />
                                </div>

                                {/* Card 2 — center, no rotation */}
                                <div
                                    className="nft-card nft-card-center absolute inset-0 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(16, 185, 129,0.25)]"
                                    style={{
                                        transformOrigin: 'bottom center',
                                        transform: 'rotate(0deg) translateY(-6px)',
                                        transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
                                        zIndex: 3,
                                    }}
                                >
                                    <img src="/nft-card.png" alt="NFT Card" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/5 to-transparent" />
                                </div>

                                {/* Card 3 — right, rotated +18deg */}
                                <div
                                    className="nft-card nft-card-right absolute inset-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                                    style={{
                                        transformOrigin: 'bottom center',
                                        transform: 'rotate(18deg) translateX(12px)',
                                        transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
                                        zIndex: 2,
                                    }}
                                >
                                    <img src="/nft-card.png" alt="NFT Card" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-purple-400/10" />
                                </div>

                                <style>{`
                                    .nft-fan:hover .nft-card-left   { transform: rotate(-28deg) translateX(-22px) translateY(-5px) !important; }
                                    .nft-fan:hover .nft-card-center { transform: rotate(0deg) translateY(-10px) !important; }
                                    .nft-fan:hover .nft-card-right  { transform: rotate(28deg) translateX(22px) translateY(-5px) !important; }
                                `}</style>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-16 gap-4" style={{
                        background: 'rgba(41, 53, 48, 0.4)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        borderRadius: '20px',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                    }}>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                            <Layers size={24} className="text-emerald-400" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-white font-black text-lg">No fractional assets yet</p>
                            <p className="text-white/40 text-sm">Start investing in tokenized real-world franchises</p>
                        </div>
                        <button
                            onClick={() => setActiveSection('explore')}
                            className="mt-2 px-6 py-2.5 bg-emerald-400 text-[#0a0a0a] font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-300 hover:shadow-[0_0_24px_rgba(16, 185, 129,0.4)] transition-all active:scale-95"
                        >
                            Browse Active Franchises
                        </button>
                    </div>
                )}
            </div>

            {/* ── C. $CROW Staking & Governance ───────────────────────────── */}
            <div className="relative overflow-hidden p-7 space-y-6" style={{
                background: 'rgba(41, 53, 48, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}>
                {/* Cyan top accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                            <Coins size={18} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">$CROW Ecosystem</h3>
                            <p className="text-[10px] text-white/30">Staking, governance & vesting</p>
                        </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
                        Coming Soon
                    </span>
                </div>

                {/* Stat boxes */}
                <div className="relative grid grid-cols-3 gap-4">
                    {[
                        { icon: Coins,      label: 'Staked Amount',  value: '— $CROW' },
                        { icon: Activity,   label: 'Voting Power',   value: '— vCROW' },
                        { icon: TrendingUp, label: 'Vesting',        value: '— Months remaining' },
                    ].map((stat, i) => (
                        <div key={i} className="rounded-xl bg-white/3 border border-white/5 p-4 space-y-2 opacity-50">
                            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                                <stat.icon size={14} className="text-emerald-400" />
                            </div>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{stat.label}</p>
                            <p className="text-sm font-black text-white/60">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Vesting chart */}
                <div className="relative space-y-2">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
                        CrowVesting.sol &amp; CrowGovernor.sol — Deploy in progress
                    </p>
                    <div className="h-28 opacity-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={vestingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="vestGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" tick={{ fill: '#ffffff30', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#ffffff30', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#0a0a0a', border: '1px solid #10b98130', borderRadius: 8, fontSize: 10 }}
                                    labelStyle={{ color: '#ffffff60' }}
                                    itemStyle={{ color: '#10b981' }}
                                />
                                <Area type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} fill="url(#vestGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── D. Transaction History ───────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-px bg-gradient-to-r from-emerald-400 to-transparent" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
                        Transaction History
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                </div>

                <div className="overflow-hidden" style={{
                    background: 'rgba(41, 53, 48, 0.4)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                }}>
                    {txFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Activity size={24} className="text-white/20" />
                            <p className="text-white/30 text-sm">No transactions recorded yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {txFeed.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
                                    {/* Type icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        tx.type === 'purchase'
                                            ? 'bg-emerald-400/10 border border-emerald-400/20'
                                            : 'bg-emerald-400/10 border border-emerald-400/20'
                                    }`}>
                                        {tx.type === 'purchase'
                                            ? <ArrowUpRight size={14} className="text-emerald-400" />
                                            : <TrendingUp size={14} className="text-emerald-400" />
                                        }
                                    </div>

                                    {/* Buyer */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{tx.buyer}</p>
                                        <p className="text-[10px] text-white/30 capitalize">{tx.type} · Franchise #{tx.franchiseId}</p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-black text-white">{tx.amount}</p>
                                        <p className="text-[10px] text-white/30">{tx.usdcValue} mUSDC</p>
                                    </div>

                                    {/* BaseScan link */}
                                    {tx.txHash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-white/20 hover:text-emerald-400 transition-colors"
                                        >
                                            <ExternalLink size={13} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── E. CTA Retention Banner ──────────────────────────────────── */}
            <div className="relative overflow-hidden px-8 py-10" style={{
                background: 'rgba(41, 53, 48, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}>
                <div className="absolute left-0 top-0 w-64 h-64 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
                <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center md:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Grow your wealth</p>
                        <h3 className="text-xl font-black text-white">
                            Maximize your wealth with new AAA opportunities.
                        </h3>
                    </div>

                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={() => setActiveSection('explore')}
                            className="px-6 py-2.5 bg-emerald-400 text-[#0a0a0a] font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-300 hover:shadow-[0_0_24px_rgba(16, 185, 129,0.4)] transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Layers size={13} /> Explore Marketplace
                        </button>
                        <button
                            disabled
                            title="Coming Soon"
                            className="px-6 py-2.5 bg-transparent text-white/40 font-black text-xs uppercase tracking-[0.2em] rounded-2xl border border-white/10 cursor-not-allowed opacity-50 flex items-center gap-2"
                        >
                            <Coins size={13} /> Stake $CROW
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
