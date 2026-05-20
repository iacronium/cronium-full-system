'use client';

/**
 * PortfolioSection — "My Portfolio" — consistent with Home dark theme.
 */

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { useEffect } from 'react';
import {
    Wallet, TrendingUp, HandCoins, UserCheck, ShieldCheck,
    BarChart2, Layers, Activity, ArrowUpRight, ExternalLink,
    RefreshCw, Coins,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

// ─── Shared card style (matches AccountAbstractionDemo) ───────────────────────
const card: React.CSSProperties = {
    background: 'rgba(20, 26, 38, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
};

// ─── Vesting chart data ───────────────────────────────────────────────────────
const vestingData = [
    { month: 'M1',  pct: 0  },
    { month: 'M6',  pct: 15 },
    { month: 'M12', pct: 30 },
    { month: 'M24', pct: 60 },
    { month: 'M36', pct: 100 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncateAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function formatUSD(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
}

function MetricLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ fontSize: '10px', color: '#8A99AD', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: '4px' }}>
            {children}
        </p>
    );
}

function Skeleton({ w, h }: { w: string; h: string }) {
    return <div style={{ width: w, height: h, borderRadius: '8px', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PortfolioSection() {
    const { address } = useAccount();
    const { setActiveSection } = useNavigation();
    const { entries: txFeed } = useTransactionFeed();

    const { data: reads, isLoading, refetch } = useReadContracts({
        contracts: [
            { address: COMPLIANCE_MANAGER_ADDRESS,   abi: COMPLIANCE_ABI, functionName: 'kycStatus',          args: [address!] },
            { address: FRANCHISE_TOKENIZER_ADDRESS,  abi: FRANCHISE_ABI,  functionName: 'balanceOf',          args: [address!, BigInt(1)] },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI,   functionName: 'getPendingDividend', args: [address!, BigInt(1)] },
            { address: MUSDC_ADDRESS,                abi: MUSDC_ABI,      functionName: 'balanceOf',          args: [address!] },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI,   functionName: 'currentCycleId',     args: [BigInt(1)] },
            { address: COMPLIANCE_MANAGER_ADDRESS,   abi: COMPLIANCE_ABI, functionName: 'demoModeActive' },
            { address: FRANCHISE_TOKENIZER_ADDRESS,  abi: FRANCHISE_ABI,  functionName: 'getFranchiseInfo',   args: [BigInt(1)] },
        ],
        query: { enabled: !!address, staleTime: 0, gcTime: 0, refetchOnMount: 'always' },
    });

    const kycStatus       = reads?.[0]?.result as number | undefined;
    const franchiseTokens = reads?.[1]?.result as bigint | undefined;
    const pendingDividend = reads?.[2]?.result as bigint | undefined;
    const musdcBalance    = reads?.[3]?.result as bigint | undefined;
    const isDemoMode      = reads?.[5]?.result as boolean | undefined;
    const franchiseInfo   = reads?.[6]?.result as { name: string; totalValue: bigint; maxSupply: bigint; currentSupply: bigint; isActive: boolean; realWorldManager: `0x${string}` } | undefined;

    const { writeContract, data: claimTxHash, isPending: isClaimPending } = useWriteContract();
    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

    useEffect(() => { if (isClaimSuccess) void refetch(); }, [isClaimSuccess, refetch]);

    function handleClaim() {
        writeContract({ address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'claimDividend', args: [BigInt(1)] });
    }

    const tokens        = franchiseTokens ?? BigInt(0);
    const tokensNum     = Number(tokens);
    const pricePerToken = franchiseInfo ? Number(franchiseInfo.totalValue) / Number(franchiseInfo.maxSupply) / 1e6 : 100;
    const maxSupplyNum  = franchiseInfo ? Number(franchiseInfo.maxSupply) : 1000;
    const portfolioUSD  = tokensNum * pricePerToken;
    const dividendHuman = pendingDividend ? Number(formatUnits(pendingDividend, 18)).toFixed(4) : '0.0000';
    const musdcHuman    = musdcBalance    ? Number(formatUnits(musdcBalance, 18)).toFixed(2)    : '0.00';
    const ownershipPct  = (tokensNum / maxSupplyNum * 100).toFixed(4);
    const ownershipBar  = Math.min(tokensNum / maxSupplyNum * 100, 100);
    const isKycVerified = kycStatus === 2;
    const noDividend    = !pendingDividend || pendingDividend === BigInt(0);

    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div style={card}>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={26} style={{ color: '#D4AF37' }} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>Connect your wallet</h2>
                        <p style={{ fontSize: '14px', color: '#8A99AD' }}>Connect to view your portfolio dashboard.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── A. Net Worth Banner ──────────────────────────────────────── */}
            <div style={card}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                    {/* Total Portfolio Value */}
                    <div>
                        <MetricLabel><BarChart2 size={10} style={{ display: 'inline', marginRight: 4, color: '#D4AF37' }} />Total Portfolio Value</MetricLabel>
                        {isLoading
                            ? <Skeleton w="160px" h="40px" />
                            : <p style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                {formatUSD(portfolioUSD)}
                              </p>
                        }
                        <p style={{ fontSize: '12px', color: '#8A99AD', marginTop: '6px' }}>
                            {tokensNum.toLocaleString()} franchise units
                        </p>
                    </div>

                    {/* Claimable Dividends */}
                    <div className="text-center">
                        <MetricLabel><HandCoins size={10} style={{ display: 'inline', marginRight: 4, color: '#D4AF37' }} />Claimable Dividends</MetricLabel>
                        {isLoading
                            ? <Skeleton w="140px" h="40px" />
                            : <p style={{ fontSize: '36px', fontWeight: 700, color: '#D4AF37', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                {dividendHuman}
                                <span style={{ fontSize: '16px', color: '#8A99AD', marginLeft: '6px' }}>mUSDC</span>
                              </p>
                        }
                        <p style={{ fontSize: '12px', color: '#8A99AD', marginTop: '6px' }}>mUSDC balance: {musdcHuman}</p>
                    </div>

                    {/* KYC badge + actions */}
                    <div className="flex flex-col items-end gap-3">
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            ...(isKycVerified || isDemoMode
                                ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }
                                : { background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' })
                        }}>
                            {isKycVerified || isDemoMode
                                ? <><ShieldCheck size={11} /> KYC Verified</>
                                : <><UserCheck size={11} /> KYC Pending</>
                            }
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleClaim}
                                disabled={noDividend || isClaimPending || isClaimConfirming}
                                className="transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                                style={{
                                    height: '40px', padding: '0 20px', width: 'auto', fontSize: '13px',
                                    fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #DFBA73 0%, #C5A059 50%, #B89753 100%)',
                                    color: '#ffffff',
                                    boxShadow: '0px 4px 12px rgba(184, 151, 83, 0.3)',
                                }}
                                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = '0px 6px 20px rgba(184,151,83,0.45)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0px 4px 12px rgba(184,151,83,0.3)'; }}
                                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {isClaimPending || isClaimConfirming
                                    ? <span className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Claiming…</span>
                                    : isClaimSuccess
                                        ? <span className="flex items-center gap-2"><Coins size={12} /> Claimed!</span>
                                        : <span className="flex items-center gap-2"><HandCoins size={12} /> Claim Rewards</span>
                                }
                            </button>
                            <button disabled style={{
                                height: '40px', padding: '0 20px', borderRadius: '10px',
                                background: 'transparent', border: '1px solid rgba(212,175,55,0.2)',
                                color: '#8A99AD', fontSize: '13px', fontWeight: 600,
                                cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <TrendingUp size={12} /> Reinvest
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── B. My Fractional Assets ──────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <span style={{ width: '24px', height: '1px', background: 'linear-gradient(to right, #D4AF37, transparent)' }} />
                    <p style={{ fontSize: '10px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
                        My Fractional Assets
                    </p>
                </div>

                {isLoading ? (
                    <div style={{ ...card, height: '180px' }} />
                ) : tokens > BigInt(0) ? (
                    <div style={card}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(212,175,55,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)')}
                    >
                        <div className="flex flex-col gap-5">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <span style={{
                                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                        padding: '3px 10px', borderRadius: '9999px',
                                        background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37',
                                    }}>
                                        ERC-1155 · Franchise #1
                                    </span>
                                    <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginTop: '10px' }}>
                                        {franchiseInfo?.name || 'Cronium Burger #1'}
                                    </h4>
                                    <p style={{ fontSize: '12px', color: '#8A99AD', marginTop: '4px' }}>
                                        Tokenized real-world franchise ownership
                                    </p>
                                </div>
                                <span style={{
                                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                                    padding: '4px 12px', borderRadius: '9999px',
                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981',
                                }}>
                                    14.2% APY
                                </span>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-10">
                                {[
                                    { label: 'Your Balance', value: `${tokensNum.toLocaleString()} Units`, gold: false },
                                    { label: 'Ownership',    value: `${ownershipPct}%`,                    gold: true  },
                                    { label: 'Value',        value: formatUSD(portfolioUSD),               gold: false },
                                ].map(s => (
                                    <div key={s.label}>
                                        <MetricLabel>{s.label}</MetricLabel>
                                        <p style={{ fontSize: '18px', fontWeight: 700, color: s.gold ? '#D4AF37' : '#FFFFFF' }}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Ownership progress bar */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <MetricLabel>Ownership stake</MetricLabel>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>
                                        {ownershipPct}% of {maxSupplyNum.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '9999px', width: `${ownershipBar}%`,
                                        background: 'linear-gradient(90deg, #D4AF37, #E5D3B3)',
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                            </div>

                            {/* Contract address */}
                            <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}>
                                <MetricLabel>Contract:</MetricLabel>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8A99AD' }}>
                                    {truncateAddr(FRANCHISE_TOKENIZER_ADDRESS)}
                                </span>
                                <a href={`https://sepolia.basescan.org/address/${FRANCHISE_TOKENIZER_ADDRESS}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 ml-auto transition-colors"
                                    style={{ fontSize: '11px', color: '#D4AF37' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#E5D3B3')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#D4AF37')}>
                                    View on BaseScan <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={card} className="flex flex-col items-center gap-4 py-10 text-center">
                        <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={24} style={{ color: '#D4AF37' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>No fractional assets yet</p>
                            <p style={{ fontSize: '13px', color: '#8A99AD', marginTop: '4px' }}>Start investing in tokenized real-world franchises</p>
                        </div>
                        <button onClick={() => setActiveSection('explore')}
                            className="transition-all relative overflow-hidden"
                            style={{
                                height: '40px', padding: '0 24px', width: 'auto', fontSize: '13px',
                                fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer', marginTop: '8px',
                                background: 'linear-gradient(135deg, #DFBA73 0%, #C5A059 50%, #B89753 100%)',
                                color: '#ffffff',
                                boxShadow: '0px 4px 12px rgba(184, 151, 83, 0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0px 6px 20px rgba(184,151,83,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0px 4px 12px rgba(184,151,83,0.3)'; }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            Browse Active Franchises
                        </button>
                    </div>
                )}
            </div>

            {/* ── C. $CROW Ecosystem ───────────────────────────────────────── */}
            <div style={card}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Coins size={18} style={{ color: '#D4AF37' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>$CROW Ecosystem</p>
                            <MetricLabel>Staking, governance & vesting</MetricLabel>
                        </div>
                    </div>
                    <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '4px 12px', borderRadius: '9999px',
                        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37',
                    }}>Coming Soon</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                        { icon: Coins,      label: 'Staked Amount', value: '— $CROW' },
                        { icon: Activity,   label: 'Voting Power',  value: '— vCROW' },
                        { icon: TrendingUp, label: 'Vesting',       value: '— Months' },
                    ].map((s, i) => (
                        <div key={i} style={{ borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.08)', opacity: 0.6 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                <s.icon size={14} style={{ color: '#D4AF37' }} />
                            </div>
                            <MetricLabel>{s.label}</MetricLabel>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <div>
                    <MetricLabel>CrowVesting.sol & CrowGovernor.sol — Deploy in progress</MetricLabel>
                    <div style={{ height: '100px', opacity: 0.5 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={vestingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="vestGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" tick={{ fill: '#8A99AD', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#8A99AD', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#141A26', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, fontSize: 10 }}
                                    labelStyle={{ color: '#8A99AD' }} itemStyle={{ color: '#D4AF37' }} />
                                <Area type="monotone" dataKey="pct" stroke="#D4AF37" strokeWidth={1.5} fill="url(#vestGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── D. Transaction History ───────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <span style={{ width: '24px', height: '1px', background: 'linear-gradient(to right, #D4AF37, transparent)' }} />
                    <p style={{ fontSize: '10px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Transaction History
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} className="animate-pulse" />
                    </p>
                </div>

                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {txFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Activity size={22} style={{ color: '#8A99AD' }} />
                            <p style={{ fontSize: '13px', color: '#8A99AD' }}>No transactions recorded yet</p>
                        </div>
                    ) : (
                        <div>
                            {txFeed.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 transition-all"
                                    style={{ padding: '14px 24px', borderBottom: '1px solid rgba(212,175,55,0.06)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {tx.type === 'purchase'
                                            ? <ArrowUpRight size={14} style={{ color: '#D4AF37' }} />
                                            : <TrendingUp size={14} style={{ color: '#10B981' }} />
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>{tx.buyer}</p>
                                        <p style={{ fontSize: '10px', color: '#8A99AD', textTransform: 'capitalize', marginTop: '2px' }}>
                                            {tx.type} · Franchise #{tx.franchiseId}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontSize: '12px', fontWeight: 700, color: tx.type === 'purchase' ? '#D4AF37' : '#10B981' }}>{tx.amount}</p>
                                        <p style={{ fontSize: '10px', color: '#8A99AD', marginTop: '2px' }}>{tx.usdcValue} mUSDC</p>
                                    </div>
                                    {tx.txHash && (
                                        <a href={`https://sepolia.basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#8A99AD', transition: 'color 200ms', flexShrink: 0 }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                                            onMouseLeave={e => (e.currentTarget.style.color = '#8A99AD')}>
                                            <ExternalLink size={13} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── E. CTA Banner ────────────────────────────────────────────── */}
            <div style={card}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p style={{ fontSize: '10px', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>
                            Grow your wealth
                        </p>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                            Maximize your wealth with new AAA opportunities.
                        </h3>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button onClick={() => setActiveSection('explore')}
                            className="flex items-center gap-2 transition-all relative overflow-hidden"
                            style={{
                                height: '40px', padding: '0 20px', width: 'auto', fontSize: '13px',
                                fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #DFBA73 0%, #C5A059 50%, #B89753 100%)',
                                color: '#ffffff',
                                boxShadow: '0px 4px 12px rgba(184, 151, 83, 0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0px 6px 20px rgba(184,151,83,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0px 4px 12px rgba(184,151,83,0.3)'; }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <Layers size={13} /> Explore Marketplace
                        </button>
                        <button disabled style={{
                            height: '40px', padding: '0 20px', borderRadius: '10px',
                            background: 'transparent', border: '1px solid rgba(212,175,55,0.2)',
                            color: '#8A99AD', fontSize: '13px', fontWeight: 600,
                            cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            <Coins size={13} /> Stake $CROW
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
