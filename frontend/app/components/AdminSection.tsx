'use client';

/**
 * AdminSection — Cronium Admin Panel
 *
 * Three main modules backed by real wagmi contract writes:
 * 1. KYC Whitelist  → ComplianceManager.setKYCStatus(address, 2)
 * 2. Deposit Dividends → USDC.approve() + DividendDistributor.depositDividends()
 * 3. Tokenize Mining Equipment → FranchiseTokenizer.createFranchise()
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    useAccount,
    useWriteContract,
    useWaitForTransactionReceipt,
    useReadContracts,
} from 'wagmi';
import { parseUnits } from 'viem';
import {
    Shield, Coins, Cpu, CheckCircle2, AlertCircle,
    Loader2, ExternalLink, Server, BarChart2, Zap, PlayCircle,
} from 'lucide-react';

import {
    COMPLIANCE_MANAGER_ADDRESS,
    DIVIDEND_DISTRIBUTOR_ADDRESS,
    FRANCHISE_TOKENIZER_ADDRESS,
    MUSDC_ADDRESS,
    COMPLIANCE_ADMIN_ABI,
    DIVIDEND_ADMIN_ABI,
    FRANCHISE_ADMIN_ABI,
    MUSDC_ABI,
} from '../config/contracts';

// ─── Status toast ─────────────────────────────────────────────────────────────

type Toast = { text: string; type: 'success' | 'error' | 'info'; hash?: string };

function ToastBar({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const colors = {
        success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        error:   'bg-red-500/10   border-red-500/30   text-red-400',
        info:    'bg-cyan-500/10  border-cyan-500/30  text-cyan-400',
    };
    const icons = {
        success: <CheckCircle2 size={16} />,
        error:   <AlertCircle size={16} />,
        info:    <Loader2 size={16} className="animate-spin" />,
    };
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${colors[toast.type]}`}>
            {icons[toast.type]}
            <span className="flex-1">{toast.text}</span>
            {toast.hash && (
                <a
                    href={`https://sepolia.basescan.org/tx/${toast.hash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="opacity-60 hover:opacity-100 transition-opacity"
                >
                    <ExternalLink size={13} />
                </a>
            )}
            <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity text-lg leading-none">&times;</button>
        </div>
    );
}

// ─── Panel card wrapper ───────────────────────────────────────────────────────

function Panel({
    icon, title, accentClass, glowClass, children,
}: {
    icon: React.ReactNode;
    title: string;
    accentClass: string;
    glowClass: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`bg-[#1C1C28] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-300`}>
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${glowClass} transition-all duration-300`} />
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentClass}`}>
                    {icon}
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            <div className="relative z-10">{children}</div>
        </div>
    );
}

// ─── Input field ──────────────────────────────────────────────────────────────

function Field({
    label, value, onChange, placeholder, type = 'text', focusColor, disabled,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; focusColor: string; disabled?: boolean;
}) {
    return (
        <div>
            <label className="text-xs text-white/50 mb-1 block font-medium">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                required
                className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none ${focusColor} transition-colors disabled:opacity-40`}
            />
        </div>
    );
}

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitBtn({ loading, label, color }: { loading: boolean; label: string; color: string }) {
    return (
        <button
            type="submit"
            disabled={loading}
            className={`w-full ${color} font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Processing…' : label}
        </button>
    );
}

// ─── Main AdminSection ────────────────────────────────────────────────────────

export default function AdminSection() {
    const { address, isConnected } = useAccount();

    // ── Toast state ──────────────────────────────────────────────────────────
    const [toasts, setToasts] = useState<(Toast & { id: number })[]>([]);
    const toastIdRef = useRef(0);

    const addToast = useCallback((toast: Toast) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { ...toast, id }]);
        if (toast.type !== 'info') {
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
        }
        return id;
    }, []);
    const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    // ── KYC form ─────────────────────────────────────────────────────────────
    const [kycAddress, setKycAddress] = useState('');
    const { writeContract: writeKyc, data: kycHash, isPending: kycPending, error: kycError } = useWriteContract();
    const { isLoading: kycConfirming, isSuccess: kycSuccess } = useWaitForTransactionReceipt({ hash: kycHash });

    useEffect(() => { if (kycSuccess) { addToast({ text: 'KYC approved on-chain!', type: 'success', hash: kycHash }); setKycAddress(''); } }, [kycSuccess, addToast, kycHash]);
    useEffect(() => { if (kycError) addToast({ text: `KYC Error: ${kycError.message.slice(0, 80)}`, type: 'error' }); }, [kycError, addToast]);

    const handleWhitelist = (e: React.FormEvent) => {
        e.preventDefault();
        writeKyc({
            address: COMPLIANCE_MANAGER_ADDRESS,
            abi: COMPLIANCE_ADMIN_ABI,
            functionName: 'setKYCStatus',
            args: [kycAddress as `0x${string}`, 2], // 2 = Verified
        });
    };

    // ── Dividend deposit form ─────────────────────────────────────────────────
    const [dividendFranchiseId, setDividendFranchiseId] = useState('1');
    const [dividendAmount, setDividendAmount] = useState('');
    const [depositStep, setDepositStep] = useState<'idle' | 'approving' | 'depositing'>('idle');

    const { writeContract: writeApprove, data: approveHash, isPending: approvePending, error: approveError } = useWriteContract();
    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: writeDeposit, data: depositHash, isPending: depositPending, error: depositError } = useWriteContract();
    const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

    useEffect(() => {
        if (approveSuccess && depositStep === 'approving') {
            setDepositStep('depositing');
            const amount = parseUnits(dividendAmount, 18); // mUSDC uses 18 decimals
            writeDeposit({
                address: DIVIDEND_DISTRIBUTOR_ADDRESS,
                abi: DIVIDEND_ADMIN_ABI,
                functionName: 'depositDividends',
                args: [BigInt(dividendFranchiseId), amount],
            });
        }
    }, [approveSuccess, depositStep, dividendAmount, dividendFranchiseId, writeDeposit]);

    useEffect(() => {
        if (depositSuccess) {
            addToast({ text: `Deposited ${dividendAmount} USDC for Franchise #${dividendFranchiseId}!`, type: 'success', hash: depositHash });
            setDividendAmount('');
            setDepositStep('idle');
        }
    }, [depositSuccess, addToast, depositHash, dividendAmount, dividendFranchiseId]);

    useEffect(() => {
        if (approveError) { addToast({ text: `Approve Error: ${approveError.message.slice(0, 80)}`, type: 'error' }); setDepositStep('idle'); }
    }, [approveError, addToast]);
    useEffect(() => {
        if (depositError) { addToast({ text: `Deposit Error: ${depositError.message.slice(0, 80)}`, type: 'error' }); setDepositStep('idle'); }
    }, [depositError, addToast]);

    const handleDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseUnits(dividendAmount, 18); // mUSDC uses 18 decimals
        setDepositStep('approving');
        writeApprove({
            address: MUSDC_ADDRESS,
            abi: MUSDC_ABI,
            functionName: 'approve',
            args: [DIVIDEND_DISTRIBUTOR_ADDRESS, amount],
        });
    };

    const isDepositLoading = approvePending || !!approveHash && !approveSuccess || depositPending || depositConfirming;
    const depositStepLabel = depositStep === 'approving' ? 'Approving USDC…' : depositStep === 'depositing' ? 'Depositing…' : 'Deposit to Contract';

    // ── Create Franchise / Tokenize Rig form ──────────────────────────────────
    const [rigName, setRigName] = useState('');
    const [rigSymbol, setRigSymbol] = useState('');
    const [rigValue, setRigValue] = useState('');
    const [rigSupply, setRigSupply] = useState('');

    const { writeContract: writeCreateFranchise, data: createHash, isPending: createPending, error: createError } = useWriteContract();
    const { isLoading: createConfirming, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash });

    useEffect(() => {
        if (createSuccess) {
            addToast({ text: `Mining rig "${rigName}" tokenized on-chain!`, type: 'success', hash: createHash });
            setRigName(''); setRigSymbol(''); setRigValue(''); setRigSupply('');
        }
    }, [createSuccess, addToast, createHash, rigName]);
    useEffect(() => { if (createError) addToast({ text: `Error: ${createError.message.slice(0, 80)}`, type: 'error' }); }, [createError, addToast]);

    const handleCreateRig = (e: React.FormEvent) => {
        e.preventDefault();
        // totalValue stored with 6 decimals in FranchiseTokenizer (e.g. 100_000e6 = $100k)
        // This is independent of mUSDC decimals — the contract uses 6 decimals for totalValue.
        const totalValue = parseUnits(rigValue, 6);
        writeCreateFranchise({
            address: FRANCHISE_TOKENIZER_ADDRESS,
            abi: FRANCHISE_ADMIN_ABI,
            functionName: 'createFranchise',
            args: [rigName, rigSymbol.toUpperCase().slice(0, 6), totalValue, BigInt(rigSupply), address!],
        });
    };

    // ── Trigger Dividend Cycle ────────────────────────────────────────────────
    const [triggerFranchiseId, setTriggerFranchiseId] = useState('1');
    const { writeContract: writeTrigger, data: triggerHash, isPending: triggerPending, error: triggerError } = useWriteContract();
    const { isLoading: triggerConfirming, isSuccess: triggerSuccess } = useWaitForTransactionReceipt({ hash: triggerHash });

    useEffect(() => {
        if (triggerSuccess) addToast({ text: `Dividend cycle triggered for Rig #${triggerFranchiseId}! Users can now claim.`, type: 'success', hash: triggerHash });
    }, [triggerSuccess, addToast, triggerFranchiseId, triggerHash]);
    useEffect(() => {
        if (triggerError) addToast({ text: `Trigger Error: ${triggerError.message.slice(0, 80)}`, type: 'error' });
    }, [triggerError, addToast]);

    const handleTrigger = (e: React.FormEvent) => {
        e.preventDefault();
        // performUpkeep expects abi.encode(franchiseId) as bytes
        const encoded = `0x${BigInt(triggerFranchiseId).toString(16).padStart(64, '0')}` as `0x${string}`;
        writeTrigger({
            address: DIVIDEND_DISTRIBUTOR_ADDRESS,
            abi: DIVIDEND_ADMIN_ABI,
            functionName: 'performUpkeep',
            args: [encoded],
        });
    };

    // ── On-chain stats ────────────────────────────────────────────────────────
    const { data: stats } = useReadContracts({
        contracts: [
            { address: FRANCHISE_TOKENIZER_ADDRESS, abi: FRANCHISE_ADMIN_ABI, functionName: 'nextFranchiseId' },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ADMIN_ABI, functionName: 'currentCycleId', args: [BigInt(1)] },
            { address: COMPLIANCE_MANAGER_ADDRESS,   abi: COMPLIANCE_ADMIN_ABI, functionName: 'demoModeActive' },
        ],
        query: { refetchInterval: 10_000 },
    });

    const nextId  = stats?.[0]?.result as bigint | undefined;
    const cycleId = stats?.[1]?.result as bigint | undefined;

    // ── Not connected ─────────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                    <Server size={28} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Connect your wallet</h2>
                <p className="text-white/40 text-sm">Admin panel requires wallet connection and admin role.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-20">

            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-px bg-gradient-to-r from-purple-400 to-transparent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Cronium Operations</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Admin Dashboard</h1>
                <p className="text-white/50 mt-1">Manage KYC compliance, tokenize mining equipment, and deposit USDC dividends.</p>
            </div>

            {/* Live stat pills */}
            <div className="flex flex-wrap gap-3">
                {[
                    { icon: <Cpu size={13} />, label: 'Total Rigs Tokenized', value: nextId ? `${Number(nextId) - 1}` : '—', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
                    { icon: <BarChart2 size={13} />, label: 'Dividend Cycles', value: cycleId !== undefined ? String(cycleId) : '—', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                    { icon: <Zap size={13} />, label: 'Admin Wallet', value: address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
                ].map((stat, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-full border ${stat.color}`}>
                        {stat.icon}
                        <span className="text-white/40">{stat.label}:</span>
                        <span>{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Toast stack */}
            {toasts.length > 0 && (
                <div className="flex flex-col gap-2">
                    {toasts.map(t => <ToastBar key={t.id} toast={t} onClose={() => removeToast(t.id)} />)}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── KYC Panel ────────────────────────────────────────────── */}
                <Panel
                    icon={<Shield size={20} className="text-cyan-400" />}
                    title="KYC Whitelist"
                    accentClass="bg-cyan-500/20 text-cyan-400"
                    glowClass="bg-cyan-500/10 group-hover:bg-cyan-500/15"
                >
                    <form onSubmit={handleWhitelist} className="flex flex-col gap-4">
                        <Field
                            label="Wallet Address to Approve"
                            value={kycAddress}
                            onChange={setKycAddress}
                            placeholder="0x..."
                            focusColor="focus:border-cyan-500/50"
                            disabled={kycPending || kycConfirming}
                        />
                        <p className="text-[10px] text-white/30 font-mono">
                            → ComplianceManager.setKYCStatus(address, 2)
                        </p>
                        <SubmitBtn
                            loading={kycPending || kycConfirming}
                            label="Approve User On-Chain"
                            color="bg-cyan-500 hover:bg-cyan-400 text-black"
                        />
                        {kycHash && (
                            <a
                                href={`https://sepolia.basescan.org/tx/${kycHash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                            >
                                <ExternalLink size={11} /> View on BaseScan
                            </a>
                        )}
                    </form>
                </Panel>

                {/* ── Dividend Deposit Panel ───────────────────────────────── */}
                <Panel
                    icon={<Coins size={20} className="text-emerald-400" />}
                    title="Deposit Dividends (USDC)"
                    accentClass="bg-emerald-500/20 text-emerald-400"
                    glowClass="bg-emerald-500/10 group-hover:bg-emerald-500/15"
                >
                    <form onSubmit={handleDeposit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="Rig ID (Franchise)"
                                value={dividendFranchiseId}
                                onChange={setDividendFranchiseId}
                                type="number"
                                placeholder="1"
                                focusColor="focus:border-emerald-500/50"
                                disabled={isDepositLoading}
                            />
                            <Field
                                label="Amount (USDC)"
                                value={dividendAmount}
                                onChange={setDividendAmount}
                                type="number"
                                placeholder="0.00"
                                focusColor="focus:border-emerald-500/50"
                                disabled={isDepositLoading}
                            />
                        </div>
                        <div className="text-[10px] text-white/30 font-mono space-y-0.5">
                        <p>Step 1 → USDC.approve(distributor, amount)</p>
                            <p>Step 2 → DividendDistributor.depositDividends(id, amount)</p>
                        </div>
                        <SubmitBtn
                            loading={isDepositLoading}
                            label={depositStepLabel}
                            color="bg-emerald-500 hover:bg-emerald-400 text-black"
                        />
                        {depositHash && (
                            <a
                                href={`https://sepolia.basescan.org/tx/${depositHash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
                            >
                                <ExternalLink size={11} /> View on BaseScan
                            </a>
                        )}
                    </form>
                </Panel>

                {/* ── Tokenize Mining Equipment ────────────────────────────── */}
                <Panel
                    icon={<Cpu size={20} className="text-purple-400" />}
                    title="Tokenize Mining Equipment"
                    accentClass="bg-purple-500/20 text-purple-400"
                    glowClass="bg-purple-500/10 group-hover:bg-purple-500/15"
                >
                    <form onSubmit={handleCreateRig} className="flex flex-col gap-4">
                        <Field
                            label="Equipment Name & Hashrate"
                            value={rigName}
                            onChange={setRigName}
                            placeholder="e.g. Antminer S19 Pro — 110TH/s"
                            focusColor="focus:border-purple-500/50"
                            disabled={createPending || createConfirming}
                        />
                        <Field
                            label="Token Symbol (3–6 chars, e.g. ANT, S19)"
                            value={rigSymbol}
                            onChange={(v) => setRigSymbol(v.toUpperCase().slice(0, 6))}
                            placeholder="ANT"
                            focusColor="focus:border-purple-500/50"
                            disabled={createPending || createConfirming}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="Total Value (USDC)"
                                value={rigValue}
                                onChange={setRigValue}
                                type="number"
                                placeholder="10000"
                                focusColor="focus:border-purple-500/50"
                                disabled={createPending || createConfirming}
                            />
                            <Field
                                label="Max Token Supply"
                                value={rigSupply}
                                onChange={setRigSupply}
                                type="number"
                                placeholder="100"
                                focusColor="focus:border-purple-500/50"
                                disabled={createPending || createConfirming}
                            />
                        </div>
                        <p className="text-[10px] text-white/30 font-mono">
                            → FranchiseTokenizer.createFranchise(name, symbol, value, supply, adminAddr)
                        </p>
                        <SubmitBtn
                            loading={createPending || createConfirming}
                            label="Tokenize Rig On-Chain"
                            color="bg-purple-500 hover:bg-purple-400 text-black"
                        />
                        {createHash && (
                            <a
                                href={`https://sepolia.basescan.org/tx/${createHash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-purple-400/60 hover:text-purple-400 transition-colors"
                            >
                                <ExternalLink size={11} /> View on BaseScan
                            </a>
                        )}
                    </form>
                </Panel>

                {/* ── Trigger Dividend Cycle Panel ──────────────────────────── */}
                <Panel
                    icon={<PlayCircle size={20} className="text-yellow-400" />}
                    title="Trigger Dividend Cycle"
                    accentClass="bg-yellow-500/20 text-yellow-400"
                    glowClass="bg-yellow-500/10 group-hover:bg-yellow-500/15"
                >
                    <form onSubmit={handleTrigger} className="flex flex-col gap-4">
                        <Field
                            label="Rig ID (Franchise)"
                            value={triggerFranchiseId}
                            onChange={setTriggerFranchiseId}
                            type="number"
                            placeholder="1"
                            focusColor="focus:border-yellow-500/50"
                            disabled={triggerPending || triggerConfirming}
                        />
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 space-y-1">
                            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">⚡ Step 2 of the deposit flow</p>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                                Run this <span className="text-white/70 font-mono">after</span> depositing USDC.
                                Distributes the pending pool to all token holders so they can claim.
                            </p>
                        </div>
                        <p className="text-[10px] text-white/30 font-mono">
                            → DividendDistributor.performUpkeep(abi.encode(franchiseId))
                        </p>
                        <SubmitBtn
                            loading={triggerPending || triggerConfirming}
                            label="Distribute to Holders"
                            color="bg-yellow-500 hover:bg-yellow-400 text-black"
                        />
                        {triggerHash && (
                            <a
                                href={`https://sepolia.basescan.org/tx/${triggerHash}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-yellow-400/60 hover:text-yellow-400 transition-colors"
                            >
                                <ExternalLink size={11} /> View on BaseScan
                            </a>
                        )}
                    </form>
                </Panel>

                {/* ── Contract Addresses Panel ───────────────────────────────── */}
                <div className="bg-[#1C1C28] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Server size={18} className="text-white/40" /> Contract Addresses
                    </h2>
                    {[
                        { label: 'FranchiseTokenizer', addr: FRANCHISE_TOKENIZER_ADDRESS, color: 'text-purple-400' },
                        { label: 'ComplianceManager', addr: COMPLIANCE_MANAGER_ADDRESS, color: 'text-cyan-400' },
                        { label: 'DividendDistributor', addr: DIVIDEND_DISTRIBUTOR_ADDRESS, color: 'text-emerald-400' },
                        { label: 'mUSDC Token', addr: MUSDC_ADDRESS, color: 'text-yellow-400' },
                    ].map(({ label, addr, color }) => (
                        <div key={label} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</span>
                            <a
                                href={`https://sepolia.basescan.org/address/${addr}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
                            >
                                {addr.slice(0, 6)}…{addr.slice(-4)}
                                <ExternalLink size={10} />
                            </a>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
