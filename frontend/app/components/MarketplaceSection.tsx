'use client';

/**
 * MarketplaceSection — Secondary Market for Mining Rig NFTs
 *
 * Listings are stored in localStorage (off-chain for MVP).
 * Purchases use ComplianceManager.purchaseTokens() which enforces KYC on-chain.
 * Transfer hook in FranchiseTokenizer._update() will revert if buyer is not KYC verified.
 */

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
    ShoppingBag, Tag, Cpu, Shield, CheckCircle2, AlertCircle,
    Loader2, ExternalLink, Plus, X, Zap, Lock,
} from 'lucide-react';
import {
    COMPLIANCE_MANAGER_ADDRESS,
    FRANCHISE_TOKENIZER_ADDRESS,
    MUSDC_ADDRESS,
    COMPLIANCE_ABI,
    MUSDC_ABI,
} from '../config/contracts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Listing = {
    id: string;
    franchiseId: number;
    seller: string;
    tokenAmount: number;
    pricePerToken: number; // USDC
    rigName: string;
    createdAt: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LS_KEY = 'cronium_marketplace_listings';

function getListings(): Listing[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
}
function saveListings(listings: Listing[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(listings));
}
function truncate(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }

// ─── KYC Badge ────────────────────────────────────────────────────────────────

function KycBadge({ status, demo }: { status: number | undefined; demo: boolean | undefined }) {
    const verified = status === 2 || demo;
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
            verified ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                     : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
        }`}>
            {verified ? <><Shield size={11} /> KYC Verified</> : <><Lock size={11} /> KYC Required</>}
        </div>
    );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({
    listing, isOwn, onBuy, onRemove, buyLoading, isVerified,
}: {
    listing: Listing;
    isOwn: boolean;
    onBuy: (l: Listing) => void;
    onRemove: (id: string) => void;
    buyLoading: boolean;
    isVerified: boolean;
}) {
    const totalPrice = listing.pricePerToken * listing.tokenAmount;
    return (
        <div className="bg-[#1C1C28] border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />

            {/* Header */}
            <div className="flex items-start justify-between mb-3 relative z-10">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                        Rig #{listing.franchiseId}
                    </span>
                    <h3 className="text-white font-bold mt-2 text-sm leading-snug">{listing.rigName}</h3>
                    <p className="text-white/40 text-[11px] mt-0.5">Seller: {truncate(listing.seller)}</p>
                </div>
                {isOwn && (
                    <button onClick={() => onRemove(listing.id)} className="text-white/20 hover:text-red-400 transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                {[
                    { label: 'Tokens', value: listing.tokenAmount.toLocaleString() },
                    { label: 'Price/Token', value: `$${listing.pricePerToken}` },
                    { label: 'Total', value: `$${totalPrice.toLocaleString()}` },
                ].map(s => (
                    <div key={s.label} className="bg-black/20 rounded-xl p-2 text-center">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{s.label}</p>
                        <p className="text-white font-black text-sm mt-0.5">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Buy button */}
            <div className="relative z-10">
                {isOwn ? (
                    <div className="text-center text-[11px] text-white/30 py-2">Your listing</div>
                ) : isVerified ? (
                    <button
                        onClick={() => onBuy(listing)}
                        disabled={buyLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {buyLoading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                        {buyLoading ? 'Buying…' : `Buy for $${totalPrice.toLocaleString()} USDC`}
                    </button>
                ) : (
                    <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-[11px]">
                        <Lock size={13} /> KYC Required to Purchase
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketplaceSection() {
    const { address, isConnected } = useAccount();
    const [listings, setListings] = useState<Listing[]>([]);
    const [showListForm, setShowListForm] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    // List form state
    const [listFranchiseId, setListFranchiseId] = useState('1');
    const [listRigName, setListRigName] = useState('');
    const [listTokenAmount, setListTokenAmount] = useState('');
    const [listPricePerToken, setListPricePerToken] = useState('');

    // Buy state
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [buyStep, setBuyStep] = useState<'idle' | 'approving' | 'buying'>('idle');

    // On-chain reads
    const { data: kycStatus } = useReadContract({
        address: COMPLIANCE_MANAGER_ADDRESS,
        abi: COMPLIANCE_ABI,
        functionName: 'kycStatus',
        args: [address!],
        query: { enabled: !!address },
    });
    const { data: demoMode } = useReadContract({
        address: COMPLIANCE_MANAGER_ADDRESS,
        abi: COMPLIANCE_ABI,
        functionName: 'demoModeActive',
    });

    const isVerified = kycStatus === 2 || !!demoMode;

    // Load listings from localStorage
    useEffect(() => { setListings(getListings()); }, []);

    const showMsg = (text: string, type: 'success' | 'error' | 'info') => {
        setToast({ text, type });
        if (type !== 'info') setTimeout(() => setToast(null), 5000);
    };

    // ── Create listing (off-chain) ────────────────────────────────────────────
    const handleList = (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;
        const newListing: Listing = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            franchiseId: Number(listFranchiseId),
            seller: address,
            tokenAmount: Number(listTokenAmount),
            pricePerToken: Number(listPricePerToken),
            rigName: listRigName,
            createdAt: Date.now(),
        };
        const updated = [newListing, ...listings];
        saveListings(updated);
        setListings(updated);
        setShowListForm(false);
        setListRigName(''); setListTokenAmount(''); setListPricePerToken('');
        showMsg('Listing created! Other Cronium users can now buy your tokens.', 'success');
    };

    const removeListing = (id: string) => {
        const updated = listings.filter(l => l.id !== id);
        saveListings(updated);
        setListings(updated);
    };

    // ── Buy flow: USDC approve → purchaseTokens ───────────────────────────────
    const { writeContract: writeApprove, data: approveHash } = useWriteContract();
    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: writeBuy, data: buyHash, error: buyError } = useWriteContract();
    const { isLoading: buyConfirming, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyHash });

    const activeListing = buyingId ? listings.find(l => l.id === buyingId) : null;

    useEffect(() => {
        if (approveSuccess && buyStep === 'approving' && activeListing) {
            setBuyStep('buying');
            const total = parseUnits(String(activeListing.pricePerToken * activeListing.tokenAmount), 18); // mUSDC uses 18 decimals
            writeBuy({
                address: COMPLIANCE_MANAGER_ADDRESS,
                abi: COMPLIANCE_ABI,
                functionName: 'purchaseTokens',
                args: [BigInt(activeListing.franchiseId), BigInt(activeListing.tokenAmount), total],
            });
        }
    }, [approveSuccess]);

    useEffect(() => {
        if (buySuccess && activeListing) {
            showMsg(`Purchased ${activeListing.tokenAmount} tokens of "${activeListing.rigName}"!`, 'success');
            removeListing(activeListing.id);
            setBuyingId(null);
            setBuyStep('idle');
        }
    }, [buySuccess]);

    useEffect(() => {
        if (buyError) {
            showMsg(`Error: ${buyError.message.slice(0, 100)}`, 'error');
            setBuyingId(null);
            setBuyStep('idle');
        }
    }, [buyError]);

    const handleBuy = (listing: Listing) => {
        if (!isVerified) return;
        setBuyingId(listing.id);
        setBuyStep('approving');
        const total = parseUnits(String(listing.pricePerToken * listing.tokenAmount), 18); // mUSDC uses 18 decimals
        writeApprove({
            address: MUSDC_ADDRESS,
            abi: MUSDC_ABI,
            functionName: 'approve',
            args: [COMPLIANCE_MANAGER_ADDRESS, total],
        });
    };

    // ── Not connected ─────────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <ShoppingBag size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Connect your wallet</h2>
                <p className="text-white/40 text-sm">Connect to browse and trade mining rig NFTs.</p>
            </div>
        );
    }

    const myListings = listings.filter(l => l.seller.toLowerCase() === address?.toLowerCase());
    const otherListings = listings.filter(l => l.seller.toLowerCase() !== address?.toLowerCase());

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-px bg-gradient-to-r from-emerald-400 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Secondary Market</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Mining Rig Marketplace</h1>
                    <p className="text-white/50 mt-1">Trade tokenized Bitcoin mining equipment. KYC required for all transactions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <KycBadge status={kycStatus as number | undefined} demo={demoMode as boolean | undefined} />
                    {isVerified && (
                        <button
                            onClick={() => setShowListForm(v => !v)}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl transition-colors text-sm"
                        >
                            <Plus size={15} /> List a Rig
                        </button>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    toast.type === 'error'   ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                              'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> :
                     toast.type === 'error'   ? <AlertCircle size={16} /> :
                                               <Loader2 size={16} className="animate-spin" />}
                    <span className="flex-1">{toast.text}</span>
                    {buyHash && (
                        <a href={`https://sepolia.basescan.org/tx/${buyHash}`} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100">
                            <ExternalLink size={12} />
                        </a>
                    )}
                    <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* ── Create Listing Form ─────────────────────────────────────── */}
            {showListForm && (
                <div className="bg-[#1C1C28] border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                        <Tag size={18} className="text-emerald-400" /> Create Listing
                    </h2>
                    <form onSubmit={handleList} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="md:col-span-2">
                            <label className="text-xs text-white/50 mb-1 block font-medium">Rig Name</label>
                            <input type="text" value={listRigName} onChange={e => setListRigName(e.target.value)} required
                                placeholder="e.g. Antminer S19 Pro — 110TH/s"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs text-white/50 mb-1 block font-medium">Franchise (Rig) ID</label>
                            <input type="number" value={listFranchiseId} onChange={e => setListFranchiseId(e.target.value)} required min="1"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs text-white/50 mb-1 block font-medium">Tokens to Sell</label>
                            <input type="number" value={listTokenAmount} onChange={e => setListTokenAmount(e.target.value)} required min="1"
                                placeholder="e.g. 10"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs text-white/50 mb-1 block font-medium">Price per Token (USDC)</label>
                            <input type="number" value={listPricePerToken} onChange={e => setListPricePerToken(e.target.value)} required min="0"
                                placeholder="100"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                        </div>
                        <div className="flex gap-3 items-end">
                            <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-colors text-sm">
                                Publish Listing
                            </button>
                            <button type="button" onClick={() => setShowListForm(false)}
                                className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-colors text-sm">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Stats bar ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3">
                {[
                    { icon: <ShoppingBag size={13} />, label: 'Active Listings', value: String(listings.length), color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                    { icon: <Cpu size={13} />,         label: 'My Listings', value: String(myListings.length), color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
                    { icon: <Zap size={13} />,         label: 'KYC Enforcement', value: 'On-Chain', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
                ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-full border ${s.color}`}>
                        {s.icon}
                        <span className="text-white/40">{s.label}:</span>
                        <span>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* ── Buy Step Banner ──────────────────────────────────────────── */}
            {buyStep !== 'idle' && activeListing && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-3 flex items-center gap-3 text-cyan-400 text-sm font-medium">
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    {buyStep === 'approving'
                        ? `Step 1/2: Approving $${activeListing.pricePerToken * activeListing.tokenAmount} USDC…`
                        : `Step 2/2: Purchasing tokens from FranchiseTokenizer…`}
                </div>
            )}

            {/* ── Available Listings ───────────────────────────────────────── */}
            {otherListings.length > 0 ? (
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-4 flex items-center gap-2">
                        <span className="w-5 h-px bg-emerald-400/50" /> Available Rigs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherListings.map(l => (
                            <ListingCard
                                key={l.id}
                                listing={l}
                                isOwn={false}
                                onBuy={handleBuy}
                                onRemove={removeListing}
                                buyLoading={buyingId === l.id}
                                isVerified={isVerified}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#1C1C28] border border-white/5 rounded-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                        <ShoppingBag size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-white font-black text-lg">No listings yet</p>
                    <p className="text-white/40 text-sm text-center max-w-xs">
                        Be the first to list a mining rig token. Only KYC-verified Cronium users can participate.
                    </p>
                    {isVerified && (
                        <button onClick={() => setShowListForm(true)}
                            className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2">
                            <Plus size={14} /> Create First Listing
                        </button>
                    )}
                </div>
            )}

            {/* ── My Listings ──────────────────────────────────────────────── */}
            {myListings.length > 0 && (
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-4 flex items-center gap-2">
                        <span className="w-5 h-px bg-purple-400/50" /> My Active Listings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myListings.map(l => (
                            <ListingCard
                                key={l.id}
                                listing={l}
                                isOwn={true}
                                onBuy={handleBuy}
                                onRemove={removeListing}
                                buyLoading={false}
                                isVerified={isVerified}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Local Storage Notice ─────────────────────────────────────── */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 flex gap-4">
                <Zap size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-cyan-400 font-bold text-sm mb-1">MVP — Listings stored locally</p>
                    <p className="text-white/40 text-[12px] leading-relaxed">
                        Listings in this MVP are saved in your browser&apos;s local storage and are only visible to you.
                        Other users cannot see your listings. A shared on-chain order book is planned for a future release.
                    </p>
                </div>
            </div>

            {/* ── Compliance Notice ────────────────────────────────────────── */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex gap-4">
                <Shield size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-yellow-400 font-bold text-sm mb-1">KYC-Gated Secondary Market</p>
                    <p className="text-white/40 text-[12px] leading-relaxed">
                        All token transfers in the Cronium ecosystem are enforced on-chain via{' '}
                        <code className="text-yellow-400/80">FranchiseTokenizer._update()</code>. Any transfer to a
                        non-KYC-verified wallet will automatically revert on the Base Sepolia network.
                        The seller&apos;s listing will be delisted automatically after a successful purchase.
                    </p>
                </div>
            </div>

        </div>
    );
}
