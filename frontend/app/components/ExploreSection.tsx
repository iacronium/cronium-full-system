'use client';

import { Shield, BarChart2, Layers, Activity, ArrowUpRight, Zap, Globe, CheckCircle } from 'lucide-react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { COMPLIANCE_MANAGER_ADDRESS, COMPLIANCE_ABI } from '../config/contracts';

// ─── Live metrics hooks ───────────────────────────────────────────────────────

// $CROW token address on Base Sepolia (placeholder — update when deployed)
const CROW_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const ERC20_TOTAL_SUPPLY_ABI = [
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ─── Asset card data ──────────────────────────────────────────────────────────

const assets = [
    {
        tag: 'RWA Launchpad',
        tagColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        title: 'High-Yield Franchises',
        description: 'Democratizing physical businesses through fractional NFTs. Each token represents a verifiable ownership stake in a real-world franchise operation.',
        techStack: ['ERC-1155', 'Base L2'],
        dataLabel: 'Average Ticket',
        dataValue: '$100 USD',
        icon: Layers,
        accentColor: '#10b981',
        glowColor: 'rgba(16,185,129,0.15)',
        borderGlow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
        // Solidity overlay snippet
        codeSnippet: `function mintTokens(\n  uint256 franchiseId,\n  address to,\n  uint256 amount\n) external onlyRole(MINTER_ROLE)`,
    },
    {
        tag: 'Protocol Utility',
        tagColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        title: 'CrowToken & Governance',
        description: 'The economic engine sustaining protocol liquidity and decentralized decision-making. Holders vote on protocol upgrades and treasury allocations.',
        techStack: ['ERC-20 (Votes & Permit)', 'OpenZeppelin V5'],
        dataLabel: 'Max Supply',
        dataValue: '150M',
        icon: BarChart2,
        accentColor: '#10b981',
        glowColor: 'rgba(16,185,129,0.15)',
        borderGlow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
        codeSnippet: `contract CrowToken is\n  ERC20Votes,\n  ERC20Permit,\n  Ownable {\n  uint256 public constant MAX_SUPPLY = 150_000_000e18;`,
    },
    {
        tag: 'Infrastructure',
        tagColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        title: 'Dividend Engine',
        description: 'Automating financial flows through Chainlink Oracles. On-chain KYC compliance ensures every distribution meets regulatory requirements.',
        techStack: ['Chainlink Automation', 'On-Chain KYC'],
        dataLabel: 'Distribution',
        dataValue: '100% On-chain',
        icon: Activity,
        accentColor: '#10b981',
        glowColor: 'rgba(16,185,129,0.15)',
        borderGlow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
        codeSnippet: `function performUpkeep(\n  bytes calldata performData\n) external override nonReentrant {\n  // Chainlink Automation trigger`,
    },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = [
    { icon: BarChart2, label: 'Projected ROI', value: '340%', sub: '5-year horizon' },
    { icon: Globe, label: 'Network', value: 'Base L2', sub: 'Optimized for L2' },
    { icon: Shield, label: 'Compliance', value: 'MiCA Ready', sub: 'Liechtenstein Framework' },
    { icon: CheckCircle, label: 'Audit', value: 'OpenZeppelin', sub: 'Standards-based' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExploreSection() {
    const { address } = useAccount();

    // Live: $CROW total supply
    const { data: crowSupply } = useReadContract({
        address: CROW_TOKEN_ADDRESS,
        abi: ERC20_TOTAL_SUPPLY_ABI,
        functionName: 'totalSupply',
        query: { staleTime: 1000 * 60 * 5 },
    });

    // Live: KYC status of connected wallet
    const { data: kycStatus } = useReadContract({
        address: COMPLIANCE_MANAGER_ADDRESS,
        abi: COMPLIANCE_ABI,
        functionName: 'kycStatus',
        args: [address!],
        query: { enabled: !!address, staleTime: 0 },
    });

    const crowSupplyFormatted = crowSupply
        ? `${(Number(formatUnits(crowSupply, 18)) / 1_000_000).toFixed(1)}M`
        : '—';

    const kycLabel =
        kycStatus === 2 ? 'Verified ✓' :
        kycStatus === 1 ? 'Pending' :
        kycStatus === 3 ? 'Rejected' :
        address ? 'Not Verified' : 'Connect Wallet';

    const kycColor =
        kycStatus === 2 ? 'text-emerald-400' :
        kycStatus === 1 ? 'text-yellow-400' :
        'text-white/40';

    return (
        <div className="w-full space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── Hero Header ─────────────────────────────────────────────── */}
            <div className="space-y-4 max-w-3xl">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-px bg-gradient-to-r from-emerald-400 to-transparent"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                        Tokenized Asset Ecosystem
                    </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                    Where tangible value meets{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                        digital liquidity.
                    </span>
                </h2>
                <p className="text-white/50 text-base leading-relaxed max-w-2xl">
                    We aren't just creating tokens; we are coding the ownership of the future.
                    Explore our AAA asset infrastructure.
                </p>

                {/* Live wallet status pill */}
                {address && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-white/40">KYC Status:</span>
                        <span className={kycColor}>{kycLabel}</span>
                    </div>
                )}
            </div>

            {/* ── Asset Grid ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {assets.map((asset, i) => (
                    <div
                        key={i}
                        className={`group relative glass-panel p-0 border-white/5 overflow-hidden cursor-pointer ${asset.borderGlow}`}
                        style={{
                            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
                            e.currentTarget.style.borderColor = `${asset.accentColor}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        {/* Gradient border top accent - animado */}
                        <div
                            className="absolute top-0 left-0 right-0 h-px transition-all duration-700"
                            style={{ 
                                background: `linear-gradient(90deg, transparent, ${asset.accentColor}, transparent)`,
                                opacity: 0.5
                            }}
                        />

                        {/* Animated gradient border on hover */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                            style={{
                                background: `linear-gradient(135deg, ${asset.accentColor}10, transparent 50%, ${asset.accentColor}05)`,
                            }}
                        />

                        {/* Blueprint code overlay — decorative background */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none overflow-hidden">
                            <pre
                                className="absolute bottom-4 right-4 text-[8px] leading-relaxed font-mono text-left transform translate-x-4 group-hover:translate-x-0 transition-transform duration-700"
                                style={{ color: asset.accentColor, opacity: 0.25 }}
                            >
                                {asset.codeSnippet}
                            </pre>
                        </div>

                        {/* Glow orb - más intenso y animado */}
                        <div
                            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
                            style={{ 
                                background: asset.glowColor,
                                transform: 'scale(0.8)',
                            }}
                        />

                        {/* Particle effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div 
                                className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full animate-ping"
                                style={{ background: asset.accentColor, animationDuration: '2s' }}
                            />
                            <div 
                                className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full animate-ping"
                                style={{ background: asset.accentColor, animationDuration: '2.5s', animationDelay: '0.3s' }}
                            />
                            <div 
                                className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full animate-ping"
                                style={{ background: asset.accentColor, animationDuration: '3s', animationDelay: '0.6s' }}
                            />
                        </div>

                        <div className="relative p-7 flex flex-col gap-5 h-full">
                            {/* Tag - animado */}
                            <span 
                                className={`self-start text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${asset.tagColor} transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg`}
                                style={{
                                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                {asset.tag}
                            </span>

                            {/* Icon - con escala (sin rotación) */}
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:scale-110"
                                style={{ 
                                    background: `${asset.accentColor}15`, 
                                    border: `1px solid ${asset.accentColor}30`,
                                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                <asset.icon 
                                    size={22} 
                                    style={{ color: asset.accentColor }} 
                                    className="transition-transform duration-700 group-hover:scale-110"
                                />
                            </div>

                            {/* Content */}
                            <div className="space-y-2 flex-1">
                                <h3 className="text-lg font-black text-white leading-tight transition-colors duration-300 group-hover:text-white">
                                    {asset.title}
                                </h3>
                                <p className="text-[12px] text-white/50 leading-relaxed transition-colors duration-300 group-hover:text-white/70">
                                    {asset.description}
                                </p>
                            </div>

                            {/* Tech stack pills - animados */}
                            <div className="flex flex-wrap gap-2">
                                {asset.techStack.map((tech, idx) => (
                                    <span
                                        key={tech}
                                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 group-hover:text-white/60"
                                        style={{
                                            transitionDelay: `${idx * 50}ms`
                                        }}
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>

                            {/* Data point + live metric - animado */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5 transition-all duration-300 group-hover:border-white/10">
                                <div className="transition-transform duration-500 group-hover:translate-x-1">
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold transition-colors duration-300 group-hover:text-white/50">
                                        {asset.dataLabel}
                                    </p>
                                    <p className="text-sm font-black text-white mt-0.5 transition-all duration-300 group-hover:scale-105" style={{ transformOrigin: 'left' }}>
                                        {/* Override with live data for $CROW */}
                                        {asset.title.includes('CrowToken') && crowSupply
                                            ? `${crowSupplyFormatted} circulating`
                                            : asset.dataValue}
                                    </p>
                                </div>
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 group-hover:rotate-45"
                                    style={{ 
                                        background: `${asset.accentColor}20`,
                                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                >
                                    <ArrowUpRight size={14} style={{ color: asset.accentColor }} className="transition-transform duration-500 group-hover:-rotate-45" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Impact Metrics Panel ─────────────────────────────────────── */}
            <div className="glass-panel border-white/5 p-6 transition-all duration-500 hover:border-emerald-400/20 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-white/5">
                    {stats.map((stat, i) => (
                        <div 
                            key={i} 
                            className={`group flex items-center gap-4 ${i > 0 ? 'pl-6' : ''} transition-all duration-500 hover:scale-105 cursor-pointer`}
                            style={{
                                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        >
                            <div 
                                className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-emerald-400/20 group-hover:border-emerald-400/40 group-hover:shadow-lg"
                                style={{
                                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                <stat.icon size={18} className="text-emerald-400 transition-transform duration-500 group-hover:scale-110" />
                            </div>
                            <div className="transition-transform duration-300 group-hover:translate-x-1">
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold transition-colors duration-300 group-hover:text-emerald-400/70">
                                    {stat.label}
                                </p>
                                <p className="text-sm font-black text-white transition-all duration-300 group-hover:text-emerald-400">
                                    {stat.value}
                                </p>
                                <p className="text-[9px] text-white/30 transition-colors duration-300 group-hover:text-white/50">
                                    {stat.sub}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CTA Banner ───────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl p-px">
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/40 via-green-600/20 to-emerald-500/40" />

                <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-r from-[#0a0a0a] via-[#0d1a2e] to-[#0a0a0a] px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Glow orbs */}
                    <div className="absolute left-0 top-0 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />

                    <div className="relative space-y-2 text-center md:text-left">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <Zap size={14} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                                Ready to tokenize the real world?
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                            Join the RWA revolution.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                                Own a piece of everything.
                            </span>
                        </h3>
                    </div>

                    <div className="relative flex flex-col sm:flex-row gap-3 shrink-0">
                        <a
                            href="https://croniums-labs.gitbook.io/cronium-en-version"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-emerald-400 text-[#0a0a0a] font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform active:scale-95 flex items-center gap-2"
                        >
                            View Whitepaper
                            <ArrowUpRight size={14} />
                        </a>
                        <a
                            href="#"
                            className="px-6 py-3 bg-transparent text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl border border-white/20 hover:border-emerald-400/50 hover:text-emerald-400 transition-all flex items-center gap-2"
                        >
                            Contact Sales
                            <ArrowUpRight size={14} />
                        </a>
                    </div>
                </div>
            </div>

        </div>
    );
}
