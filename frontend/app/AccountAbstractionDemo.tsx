'use client';

import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import WalletButton from './components/WalletButton';
import WalletBalance from './components/WalletBalance';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { formatUnits, parseUnits, UserRejectedRequestError } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useTransactionFeed } from './hooks/useTransactionFeed';
import { useCcipPurchase, ETH_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from './hooks/useCcipPurchase';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis } from 'recharts';
import { Wallet as WalletIcon, TrendingUp, ArrowUpRight, Activity, Layers, ExternalLink, ChevronLeft, ChevronRight, Check, ShieldAlert, Minus, Plus, Zap, RefreshCw } from 'lucide-react';
import PurchaseProcessOverlay, { TxStep } from './components/PurchaseProcessOverlay';

import {
    FRANCHISE_TOKENIZER_ADDRESS,
    COMPLIANCE_MANAGER_ADDRESS,
    DIVIDEND_DISTRIBUTOR_ADDRESS,
    MUSDC_ADDRESS,
    FRANCHISE_ABI,
    COMPLIANCE_ABI,
    DIVIDEND_ABI,
    MUSDC_ABI,
    CCIP_SENDER_ADDRESS,
} from './config/contracts';

// Franchise image map — static per franchiseId
const FRANCHISE_IMAGES: Record<number, string[]> = {
    1: [
        '/franchises/1/photo-1.webp',
        '/franchises/1/photo-2.webp',
        '/franchises/1/photo-3.webp',
        '/franchises/1/photo-4.webp',
    ],
};
const PHOTO_LABELS: Record<number, string[]> = {
    1: ['Exterior', 'Interior', 'Producto', 'Operacion'],
};
const FALLBACK_IMAGE = '/cronium-icon.svg';

const rewardsData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 500 },
    { name: 'May', value: 900 },
    { name: 'Jun', value: 1200 },
    { name: 'Jul', value: 1100 },
    { name: 'Aug', value: 1200 },
    { name: 'Sep', value: 1800 },
];

const performanceData = [
    { name: '16', value: 20 },
    { name: '17', value: 35 },
    { name: '18', value: 15 },
    { name: '19', value: 45 },
    { name: '20', value: 30 },
    { name: '21', value: 55 },
];

const ActiveInvestments = ({ userTokens, franchiseName }: { userTokens?: bigint, franchiseName: string }) => {
    console.log('🎨 ActiveInvestments render with franchiseName:', franchiseName);
    return (
    <div style={{ 
        background: 'rgba(20, 26, 38, 0.75)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(212, 175, 55, 0.12)', 
        borderRadius: '20px', 
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
    }} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">My Portfolio</h3>
            <button className="text-white/20 hover:text-white transition-colors"><Activity size={14} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto min-h-0 flex-1">
            <div className="flex items-center justify-between group cursor-pointer p-2 rounded-[6px] transition-all" style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[6px] flex items-center justify-center p-2" style={{ background: 'rgba(212,175,55,0.1)' }}>
                        <Check size={18} style={{ color: '#D4AF37' }} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{franchiseName}</p>
                        <p className="text-[10px]" style={{ color: '#8A8F98' }}>Live Asset</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-white">{userTokens ? Number(userTokens).toLocaleString() : '0'} Units</p>
                    <p className="text-[10px] font-bold" style={{ color: '#D4AF37' }}>+Live</p>
                </div>
            </div>
            {[
                { name: "Bugto", value: '$36.25', change: '+CFX', icon: 'https://avatars.githubusercontent.com/u/108554348?s=200&v=1', color: 'bg-red-500' },
                { name: "Natnord", value: '$20.00', change: '+3.57%', icon: 'https://avatars.githubusercontent.com/u/108554348?s=200&v=2', color: 'bg-indigo-500' },
            ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer p-2 rounded-[6px] transition-all opacity-40 grayscale" style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[6px] ${item.color}/10 flex items-center justify-center p-2`}>
                            <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            <p className="text-[10px]" style={{ color: '#8A8F98' }}>Historical</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-white">{item.value}</p>
                        <p className="text-[10px] font-bold" style={{ color: '#8A8F98' }}>{item.change}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);};

const TransactionList = () => {
    const { entries, isLoading } = useTransactionFeed();
    return (
        <div style={{ 
            background: 'rgba(20, 26, 38, 0.75)', 
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 55, 0.12)', 
            borderRadius: '20px', 
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
        }} className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Recent Transactions</h3>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#D4AF37' }}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#D4AF37' }}></span>
                    </span>
                </div>
                <ExternalLink size={14} className="text-white/20" />
            </div>
            {isLoading && entries.length === 0 && (
                <div className="space-y-3 flex-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                            <div className="w-9 h-9 bg-white/5 rounded-[6px] shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-2.5 bg-white/10 rounded-full w-3/4" />
                                <div className="h-2 bg-white/5 rounded-full w-1/2" />
                            </div>
                            <div className="h-3 bg-white/10 rounded-full w-12" />
                        </div>
                    ))}
                </div>
            )}
            {!isLoading && entries.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: '#8A8F98' }}>
                    <Activity size={24} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8A8F98' }}>No transactions yet</p>
                    <p className="text-[9px]" style={{ color: '#8A8F98' }}>Waiting for on-chain activity...</p>
                </div>
            )}
            {entries.length > 0 && (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {entries.map(tx => (
                        <a
                            key={tx.id}
                            href={tx.txHash ? `https://sepolia.basescan.org/tx/${tx.txHash}` : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-[6px] transition-all group"
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)' }}>
                                    {tx.type === 'purchase'
                                        ? <ArrowUpRight size={14} style={{ color: '#D4AF37' }} />
                                        : <TrendingUp size={14} style={{ color: '#D4AF37' }} />
                                    }
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-white leading-tight">
                                        {tx.type === 'purchase'
                                            ? `${tx.buyer} bought ${tx.amount} units`
                                            : `${tx.buyer} claimed $${tx.amount}`
                                        }
                                    </p>
                                    <p className="text-[9px] mt-0.5" style={{ color: '#8A8F98' }}>
                                        Franchise #{tx.franchiseId}
                                        {tx.txHash && (
                                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                - {tx.txHash.slice(0, 8)}...
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[11px] font-black" style={{ color: '#D4AF37' }}>
                                    {tx.type === 'purchase' ? `$${tx.usdcValue}` : `+$${tx.usdcValue}`}
                                </p>
                                <p className="text-[9px]" style={{ color: '#8A8F98' }}>
                                    {tx.type === 'purchase' ? 'mUSDC' : 'dividend'}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function AccountAbstractionDemo() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    // Chain mode detection
    const isOnBaseSepolia = chainId === BASE_SEPOLIA_CHAIN_ID;
    const isOnEthSepolia  = chainId === ETH_SEPOLIA_CHAIN_ID;
    const isWrongNetwork  = isConnected && !isOnBaseSepolia && !isOnEthSepolia;
    const isCcipMode      = isOnEthSepolia && !!CCIP_SENDER_ADDRESS;

    const [isInvesting, setIsInvesting] = useState(false);
    const { writeContractAsync, data: hash } = useWriteContract();
    const { isLoading: isWaitingForTx, isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({ hash });
    const [currentFranchiseId, setCurrentFranchiseId] = useState(1);
    const [fade, setFade] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [purchaseQuantity, setPurchaseQuantity] = useState<string>('100');
    const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' | null }>({ text: '', type: null });
    const [txStep, setTxStep] = useState<TxStep>('idle');
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const queryClient = useQueryClient();

    // Flash animation state for wallet data cards
    const [portfolioFlash, setPortfolioFlash] = useState(false);
    const [holdingsFlash, setHoldingsFlash] = useState(false);
    const prevUserTokensRef = useRef<bigint | undefined>(undefined);

    const {
        sendCcipPurchase,
        step: ccipStep,
        error: ccipError,
        reset: resetCcip,
    } = useCcipPurchase();

    useEffect(() => { setMounted(true); }, []);

    // Batch 1: Static contract data
    const { data: staticData } = useReadContracts({
        contracts: [
            { address: FRANCHISE_TOKENIZER_ADDRESS, abi: FRANCHISE_ABI, functionName: 'nextFranchiseId', chainId: BASE_SEPOLIA_CHAIN_ID },
            { address: COMPLIANCE_MANAGER_ADDRESS, abi: COMPLIANCE_ABI, functionName: 'demoModeActive', chainId: BASE_SEPOLIA_CHAIN_ID },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'interval', chainId: BASE_SEPOLIA_CHAIN_ID },
        ],
        query: { staleTime: 1000 * 60 * 10 },
    });

    const nextId               = staticData?.[0].result as bigint | undefined;
    const isDemoMode           = staticData?.[1].result as boolean | undefined;
    const distributionInterval = staticData?.[2].result as bigint | undefined;

    // Batch 2: Franchise + cycle data — always reads from Base Sepolia
    // Cache for 30 seconds, no automatic polling
    const { data: franchiseData, isLoading: isFranchiseLoading, refetch: refetchFranchise } = useReadContracts({
        contracts: [
            { address: FRANCHISE_TOKENIZER_ADDRESS, abi: FRANCHISE_ABI, functionName: 'getFranchiseInfo', chainId: BASE_SEPOLIA_CHAIN_ID, args: [BigInt(currentFranchiseId)] },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'currentCycleId', chainId: BASE_SEPOLIA_CHAIN_ID, args: [BigInt(currentFranchiseId)] },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'pendingDividendPool', chainId: BASE_SEPOLIA_CHAIN_ID, args: [BigInt(currentFranchiseId)] },
        ],
        query: { staleTime: 1000 * 30, gcTime: 1000 * 60 * 5, refetchOnMount: true },
    });

    const franchiseInfo = franchiseData?.[0].result as { name: string; symbol: string; totalValue: bigint; maxSupply: bigint; currentSupply: bigint; isActive: boolean; realWorldManager: `0x${string}` } | undefined;
    const currentCycle  = franchiseData?.[1].result as bigint | undefined;
    const pendingPool   = franchiseData?.[2].result as bigint | undefined;

    // Debug: log franchise name
    useEffect(() => {
        if (franchiseInfo) {
            console.log('📋 Franchise Info:', {
                name: franchiseInfo.name,
                totalValue: franchiseInfo.totalValue.toString(),
                currentSupply: franchiseInfo.currentSupply.toString(),
                maxSupply: franchiseInfo.maxSupply.toString(),
            });
        }
    }, [franchiseInfo]);

    // Batch 3: User-specific data — always reads from Base Sepolia
    // Cache for 20 seconds, only refetch when address changes
    const { data: userData, refetch: refetchUserData } = useReadContracts({
        contracts: [
            { address: COMPLIANCE_MANAGER_ADDRESS, abi: COMPLIANCE_ABI, functionName: 'kycStatus', chainId: BASE_SEPOLIA_CHAIN_ID, args: [address!] },
            { address: MUSDC_ADDRESS, abi: MUSDC_ABI, functionName: 'allowance', chainId: BASE_SEPOLIA_CHAIN_ID, args: [address!, COMPLIANCE_MANAGER_ADDRESS] },
            { address: FRANCHISE_TOKENIZER_ADDRESS, abi: FRANCHISE_ABI, functionName: 'balanceOf', chainId: BASE_SEPOLIA_CHAIN_ID, args: [address!, BigInt(currentFranchiseId)] },
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'getPendingDividend', chainId: BASE_SEPOLIA_CHAIN_ID, args: [address!, BigInt(currentFranchiseId)] },
        ],
        query: { enabled: !!address, staleTime: 1000 * 20, gcTime: 1000 * 60 * 5, refetchOnMount: true },
    });

    const kycStatus       = userData?.[0].result as number | undefined;
    const allowance       = userData?.[1].result as bigint | undefined;
    const userTokens      = userData?.[2].result as bigint | undefined;
    const pendingDividend = userData?.[3].result as bigint | undefined;

    const refetchAllData = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['readContracts'] });
        void refetchFranchise();
        void refetchUserData();
    }, [queryClient, refetchFranchise, refetchUserData]);

    // Flash effect: fires when userTokens first loads or changes
    useEffect(() => {
        const prev = prevUserTokensRef.current;
        if (userTokens !== undefined && userTokens !== prev) {
            prevUserTokensRef.current = userTokens;
            // Only flash if there's a real value (not just 0n on first load with no tokens)
            if (prev === undefined) {
                setPortfolioFlash(true);
                setHoldingsFlash(true);
                setTimeout(() => { setPortfolioFlash(false); setHoldingsFlash(false); }, 1200);
            }
        }
    }, [userTokens]);

    // Batch 4: Historical cycle for chart
    const { data: historicalCycleData } = useReadContracts({
        contracts: [
            { address: DIVIDEND_DISTRIBUTOR_ADDRESS, abi: DIVIDEND_ABI, functionName: 'getDividendCycleInfo', chainId: BASE_SEPOLIA_CHAIN_ID, args: [BigInt(currentFranchiseId), currentCycle || BigInt(0)] },
        ],
        query: { enabled: !!currentCycle, staleTime: 1000 * 60 * 5 },
    });

    const historicalCycles = historicalCycleData?.[0].result as { cycleId: bigint; totalAmount: bigint; perTokenPayout: bigint; timestamp: bigint } | undefined;

    const liveRewardsData = useMemo(() => {
        if (!historicalCycles) return rewardsData;
        return [
            { name: 'Prev', value: 400 },
            { name: 'Prev', value: 600 },
            { name: 'Last', value: Number(historicalCycles.totalAmount) / 1e18 },
        ];
    }, [historicalCycles]);

    // Price calculation — always uses Base Sepolia franchise data
    const calculatedTotalPrice = useMemo(() => {
        if (!franchiseInfo) return BigInt(0);
        const amountToBuy = BigInt(purchaseQuantity || '0');
        const totalVal = franchiseInfo.totalValue;
        const maxSup = franchiseInfo.maxSupply;
        // pricePerToken in 6 decimals, scale to 18 for mUSDC
        const SCALE = BigInt('1000000000000'); // 10^12
        const pricePerTokenIn6 = totalVal / maxSup;
        return pricePerTokenIn6 * SCALE * amountToBuy;
    }, [franchiseInfo, purchaseQuantity]);

    // Franchise name — memoized to ensure UI updates when data loads
    const franchiseName = useMemo(() => {
        const name = franchiseInfo?.name || "McDonald's Local #12";
        console.log('🏷️ useMemo franchiseName:', name, '| franchiseInfo exists:', !!franchiseInfo);
        return name;
    }, [franchiseInfo]);

    // Franchise symbol — use on-chain symbol field, or auto-generate acronym from name
    const franchiseSymbol = useMemo(() => {
        if (franchiseInfo?.symbol && franchiseInfo.symbol.trim().length > 0) {
            return franchiseInfo.symbol.trim().toUpperCase().slice(0, 6);
        }
        // Auto-generate acronym from the first letters of each word
        const words = (franchiseInfo?.name || '').trim().split(/\s+/);
        if (words.length >= 3) return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
        if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
        return words[0]?.slice(0, 3).toUpperCase() || 'TKN';
    }, [franchiseInfo]);

    // Franchise rotation
    useEffect(() => {
        if (!nextId || Number(nextId) <= 1) return;
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setCurrentFranchiseId((prev) => {
                    const next = prev + 1;
                    return next < Number(nextId) ? next : 1;
                });
                setFade(true);
            }, 500);
        }, 20000);
        return () => clearInterval(interval);
    }, [nextId]);

    // Photo gallery autoplay:
    // Phase 1 → quick sweep (instant cuts, no crossfade so each photo is clearly visible)
    // Phase 2 → slow rotation with crossfade (4s per photo)
    const [photoTransition, setPhotoTransition] = useState(false);

    useEffect(() => {
        const photos = FRANCHISE_IMAGES[currentFranchiseId];
        if (!photos || photos.length <= 1) return;

        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];

        // Phase 1: instant cuts every 350ms — no opacity transition so each frame is crisp
        setPhotoTransition(false);
        setActivePhotoIndex(0);
        photos.forEach((_, idx) => {
            if (idx === 0) return; // already set above
            const t = setTimeout(() => {
                if (!cancelled) setActivePhotoIndex(idx);
            }, idx * 350);
            timers.push(t);
        });

        // Phase 2: after sweep finishes, enable crossfade and rotate slowly
        const sweepDuration = (photos.length - 1) * 350 + 600;
        const startSlow = setTimeout(() => {
            if (cancelled) return;
            setPhotoTransition(true);
            let current = photos.length - 1;
            const slow = setInterval(() => {
                if (cancelled) { clearInterval(slow); return; }
                current = (current + 1) % photos.length;
                setActivePhotoIndex(current);
            }, 4000);
            timers.push(slow as unknown as ReturnType<typeof setTimeout>);
        }, sweepDuration);
        timers.push(startSlow);

        return () => {
            cancelled = true;
            timers.forEach(t => clearTimeout(t));
        };
    }, [currentFranchiseId]);

    // Transaction state messages
    useEffect(() => {
        if (isWaitingForTx) {
            setStatusMessage({ text: isCcipMode ? 'Transaction pending on Ethereum Sepolia...' : 'Transaction pending on Base Sepolia...', type: 'info' });
        } else if (hash && !isWaitingForTx) {
            setStatusMessage({ text: 'Transaction confirmed!', type: 'success' });
            setTimeout(() => refetchAllData(), 2000);
            const timer = setTimeout(() => setStatusMessage({ text: '', type: null }), 10000);
            return () => clearTimeout(timer);
        }
    }, [isWaitingForTx, hash, refetchAllData, isCcipMode]);

    useEffect(() => {
        if (!isWaitingForTx && hash) setIsInvesting(false);
    }, [isWaitingForTx, hash]);

    useEffect(() => {
        if (txStep !== 'idle' && txStep !== 'success' && txStep !== 'error') {
            if (isWaitingForTx) setTxStep('confirming');
            else if (isTxSuccess) setTxStep('success');
            else if (isTxError) setTxStep('error');
        }
    }, [isWaitingForTx, isTxSuccess, isTxError, txStep]);

    useEffect(() => {
        if (address) void refetchUserData();
    }, [address, refetchUserData]);

    // Demo setup — only works on Base Sepolia
    const handleDemoSetup = async () => {
        if (!address) return;
        if (!isOnBaseSepolia) {
            setStatusMessage({ text: 'Demo setup requires Base Sepolia. Switch network first.', type: 'error' });
            return;
        }
        setIsInvesting(true);
        setStatusMessage({ text: 'Setting up demo environment...', type: 'info' });
        try {
            setStatusMessage({ text: 'Minting 1,000 test mUSDC...', type: 'info' });
            await writeContractAsync({
                address: MUSDC_ADDRESS,
                abi: MUSDC_ABI,
                functionName: 'mint',
                args: [address, parseUnits('1000', 18)],
                gas: BigInt(100_000),
            });

            // If demoModeActive is active on-chain, or if the user is already verified (kycStatus === 2),
            // we do NOT need to call setKYCStatus at all!
            if (isDemoMode) {
                setStatusMessage({ 
                    text: 'Success! 1,000 mUSDC minted. (On-chain Demo Mode is active, KYC check is bypassed!)', 
                    type: 'success' 
                });
                setIsInvesting(false);
                refetchUserData();
                return;
            }

            if (kycStatus === 2) {
                setStatusMessage({ 
                    text: 'Success! 1,000 mUSDC minted. (Your wallet is already KYC verified!)', 
                    type: 'success' 
                });
                setIsInvesting(false);
                refetchUserData();
                return;
            }

            // If not in demo mode and not verified, we TRY to set the KYC status, but handle unauthorized error gracefully
            try {
                setStatusMessage({ text: 'Attempting on-chain KYC verification...', type: 'info' });
                await writeContractAsync({
                    address: COMPLIANCE_MANAGER_ADDRESS,
                    abi: COMPLIANCE_ABI,
                    functionName: 'setKYCStatus',
                    args: [address, 2],
                    gas: BigInt(100_000),
                });
                setStatusMessage({ text: 'Success! 1,000 mUSDC minted & KYC verified on-chain!', type: 'success' });
            } catch (kycErr: any) {
                console.warn('KYC set error (gracefully caught):', kycErr);
                // If it fails because of permissions (normal user wallet), we explain it gracefully
                setStatusMessage({ 
                    text: 'mUSDC minted! (Demo KYC auto-verification skipped: only the Admin role can call setKYCStatus. Please whitelist your address in the Admin Dashboard, or enable Demo Mode on the contract.)', 
                    type: 'success' 
                });
            }
        } catch (error: unknown) {
            console.error(error);
            if (error instanceof UserRejectedRequestError) {
                setStatusMessage({ text: 'Setup cancelled.', type: 'error' });
            } else {
                setStatusMessage({ text: 'Demo setup failed.', type: 'error' });
            }
        } finally {
            setIsInvesting(false);
            refetchUserData();
        }
    };


    const handleInvest = async () => {
        if (!address || !franchiseInfo) return;
        if (isWrongNetwork) {
            setStatusMessage({ text: 'Wrong network. Switch to Base Sepolia or Ethereum Sepolia.', type: 'error' });
            return;
        }
        setIsInvesting(true);

        // CCIP path: user is on Ethereum Sepolia
        if (isCcipMode) {
            setStatusMessage({ text: 'Approving USDC for cross-chain purchase...', type: 'info' });
            setTxStep('signing');
            resetCcip();
            const paymentAmountUsdc = Number(formatUnits(calculatedTotalPrice, 18));
            const txHash = await sendCcipPurchase(currentFranchiseId, Number(purchaseQuantity), paymentAmountUsdc);
            if (txHash) {
                setStatusMessage({ text: 'CCIP message sent! Your tokens will arrive on Base Sepolia in ~20 min.', type: 'success' });
                setTxStep('success');
            } else if (ccipError) {
                setStatusMessage({ text: ccipError, type: 'error' });
                setTxStep('error');
            }
            setIsInvesting(false);
            return;
        }

        // Direct path: user is on Base Sepolia
        setStatusMessage({ text: 'Starting transaction...', type: 'info' });
        try {
            const totalPrice = calculatedTotalPrice;

            if (totalPrice > parseUnits('3000', 18)) {
                setStatusMessage({ text: 'Limit exceeded: Investment > $3,000 requires advanced verification.', type: 'error' });
                setIsInvesting(false);
                return;
            }

            if (!isDemoMode && kycStatus !== 2) {
                setStatusMessage({ text: 'KYC Required: Please verify your identity first.', type: 'error' });
                setIsInvesting(false);
                return;
            }

            if (!allowance || allowance < totalPrice) {
                setStatusMessage({ text: 'Waiting for mUSDC approval...', type: 'info' });
                await writeContractAsync({
                    address: MUSDC_ADDRESS,
                    abi: MUSDC_ABI,
                    functionName: 'approve',
                    args: [COMPLIANCE_MANAGER_ADDRESS, parseUnits('1000000', 18)],
                    gas: BigInt(100_000),
                });
                return;
            }

            setStatusMessage({ text: 'Please sign the purchase in your wallet...', type: 'info' });
            setTxStep('signing');
            await writeContractAsync({
                address: COMPLIANCE_MANAGER_ADDRESS,
                abi: COMPLIANCE_ABI,
                functionName: 'purchaseTokens',
                args: [BigInt(currentFranchiseId), BigInt(purchaseQuantity), totalPrice],
                gas: BigInt(300_000),
            });
        } catch (error: unknown) {
            console.error(error);
            setTxStep('error');
            if (error instanceof UserRejectedRequestError) {
                setStatusMessage({ text: 'Transaction cancelled.', type: 'error' });
            } else {
                setStatusMessage({ text: 'Error processing investment.', type: 'error' });
            }
            setIsInvesting(false);
        }
    };

    const handleClaim = async () => {
        if (!address || !currentCycle) return;
        if (isWrongNetwork) {
            setStatusMessage({ text: 'Wrong network. Switch to Base Sepolia.', type: 'error' });
            return;
        }
        setIsInvesting(true);
        setStatusMessage({ text: 'Initiating dividend claim...', type: 'info' });
        try {
            await writeContractAsync({
                address: DIVIDEND_DISTRIBUTOR_ADDRESS,
                abi: DIVIDEND_ABI,
                functionName: 'claimDividend',
                args: [BigInt(currentFranchiseId)],
                gas: BigInt(200_000),
            });
        } catch (error: unknown) {
            console.error(error);
            if (error instanceof UserRejectedRequestError) {
                setStatusMessage({ text: 'Claim cancelled.', type: 'error' });
            } else {
                setStatusMessage({ text: 'Claim failed.', type: 'error' });
            }
            setIsInvesting(false);
        }
    };

    if (!mounted) return (
        <div className="w-full flex items-center justify-center p-20">
            <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(212,175,55,0.15)', borderTopColor: '#D4AF37' }}></div>
        </div>
    );

    const currentSupply = franchiseInfo ? Number(franchiseInfo.currentSupply) : 650000;
    const maxSupply = franchiseInfo ? Number(franchiseInfo.maxSupply) : 1000000;
    const progress = (currentSupply / maxSupply) * 100;
    const marketCap = franchiseInfo ? `$${Number(formatUnits(franchiseInfo.totalValue, 6)).toLocaleString()}` : "$100,000";

    return (
        <div className="w-full space-y-4">

            {/* Status banner */}
            {statusMessage.text && (
                <div className={`p-4 rounded-[6px] border flex items-center justify-between gap-4 transition-all ${
                    statusMessage.type === 'error'
                        ? 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-[#EF4444]'
                        : statusMessage.type === 'success'
                        ? 'bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.15)] text-[#D4AF37]'
                        : 'bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.15)] text-[#D4AF37]'
                }`}>
                    <div className="flex items-center gap-3">
                        {statusMessage.type === 'info' && <Activity className="animate-pulse" size={16} />}
                        {statusMessage.type === 'error' && <ShieldAlert size={16} />}
                        {statusMessage.type === 'success' && <Check size={16} />}
                        <span className="text-xs font-bold uppercase tracking-wider">{statusMessage.text}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {hash && (
                            <a
                                href={isCcipMode
                                    ? `https://sepolia.etherscan.io/tx/${hash}`
                                    : `https://sepolia.basescan.org/tx/${hash}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest hover:underline whitespace-nowrap"
                            >
                                {isCcipMode ? 'View on Etherscan' : 'View on BaseScan'} <ExternalLink size={12} />
                            </a>
                        )}
                        <button
                            onClick={refetchAllData}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            title="Refresh data manually"
                        >
                            <RefreshCw size={10} /> Refresh
                        </button>
                    </div>
                </div>
            )}

            {/* Wrong network banner */}
            {isWrongNetwork && isConnected && (
                <div className="p-4 rounded-[6px] border flex items-center justify-between gap-4" style={{ background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            Wrong network. Switch to Base Sepolia or Ethereum Sepolia.
                        </span>
                    </div>
                    <button
                        onClick={() => switchChain({ chainId: baseSepolia.id })}
                        className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-[6px] transition-all"
                        style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.12)')}
                    >
                        Switch to Base Sepolia
                    </button>
                </div>
            )}

            {/* CCIP mode banner */}
            {isCcipMode && isConnected && (
                <div className="p-3 rounded-[6px] border flex items-center justify-between gap-4" style={{ background: 'rgba(212,175,55,0.05)', borderColor: 'rgba(212,175,55,0.12)', color: '#8A8F98' }}>
                    <div className="flex items-center gap-3">
                        <Zap size={14} style={{ color: '#D4AF37' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                            CCIP Mode - purchases bridge to Base Sepolia via Chainlink (~20 min)
                        </span>
                    </div>
                    <button
                        onClick={() => switchChain({ chainId: baseSepolia.id })}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-[6px] transition-all whitespace-nowrap"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212, 175, 55, 0.12)', color: '#8A8F98' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                        Switch to Base Sepolia
                    </button>
                </div>
            )}

            <div className="w-full grid grid-cols-12 gap-6 items-stretch">

            {/* Portfolio Value */}
            <div className="col-span-12 md:col-span-4 flex flex-col justify-between" style={{ 
                background: 'rgba(20, 26, 38, 0.75)', 
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: portfolioFlash ? '1px solid rgba(142, 205, 99, 0.6)' : '1px solid rgba(212, 175, 55, 0.12)', 
                borderRadius: '20px', 
                padding: '20px',
                boxShadow: portfolioFlash
                    ? '0 0 0 3px rgba(142,205,99,0.15), 0 8px 32px rgba(142,205,99,0.25)'
                    : '0 8px 32px rgba(0, 0, 0, 0.35)',
                transition: 'border 600ms ease, box-shadow 600ms ease',
            }}>
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Portfolio Value</span>
                        <div className="flex gap-2">
                            <button onClick={handleDemoSetup} title="Demo: Mint & Verify" className="transition-colors" style={{ color: '#8A8F98' }} onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')} onMouseLeave={e => (e.currentTarget.style.color = '#8A8F98')}><ShieldAlert size={14} /></button>
                            <WalletIcon size={14} className="text-white/20" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter transition-colors duration-700"
                        style={{ color: portfolioFlash ? '#8ECD63' : '#FFFFFF' }}>
                        ${franchiseInfo && userTokens !== undefined
                            ? (Number(userTokens) * Number(franchiseInfo.totalValue / franchiseInfo.maxSupply) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0.00'
                        }
                    </h2>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold" style={{ color: '#D4AF37' }}>
                    <TrendingUp size={12} />
                    <span>+12.5% this month</span>
                </div>
            </div>

            {/* Holdings */}
            <div className="col-span-12 md:col-span-4 flex flex-col justify-between" style={{ 
                background: 'rgba(20, 26, 38, 0.75)', 
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: holdingsFlash ? '1px solid rgba(142, 205, 99, 0.6)' : '1px solid rgba(212, 175, 55, 0.12)', 
                borderRadius: '20px', 
                padding: '20px',
                boxShadow: holdingsFlash
                    ? '0 0 0 3px rgba(142,205,99,0.15), 0 8px 32px rgba(142,205,99,0.25)'
                    : '0 8px 32px rgba(0, 0, 0, 0.35)',
                transition: 'border 600ms ease, box-shadow 600ms ease',
            }}>
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Holdings</span>
                        <Layers size={14} className="text-white/20" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter transition-colors duration-700"
                            style={{ color: holdingsFlash ? '#8ECD63' : '#FFFFFF' }}>
                            {userTokens !== undefined ? Number(userTokens).toLocaleString() : '0'}
                        </span>
                        <span className="text-lg font-black" style={{ color: holdingsFlash ? '#8ECD63' : '#D4AF37', transition: 'color 700ms ease' }}>Units</span>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#8A8F98' }}>
                    <span>Diversified in 4 sectors</span>
                </div>
            </div>

            {/* Wallet Balance */}
            <div className="col-span-12 md:col-span-4">
                <WalletBalance flash={portfolioFlash} />
            </div>

            </div>

            {/* Main Content Grid */}
            <div className="w-full grid grid-cols-12 gap-6 items-stretch">

                {/* Franchise Card */}
                <div className="col-span-12 lg:col-span-8">
                    <div style={{ 
                        background: 'rgba(20, 26, 38, 0.75)', 
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(212, 175, 55, 0.12)', 
                        borderRadius: '20px', 
                        padding: '28px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                        transition: 'opacity 0.5s ease-in-out', 
                        opacity: fade ? 1 : 0 
                    }} className="relative overflow-hidden">
                        
                        <PurchaseProcessOverlay
                            step={txStep}
                            isCcip={isCcipMode}
                            onClose={() => setTxStep('idle')}
                            tokenSymbol={franchiseSymbol}
                            tokenAmount={purchaseQuantity}
                        />

                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter mb-1">{franchiseName}</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mt-2">Franchise #{currentFranchiseId} • Live Asset</p>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-[6px]" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.15)' }}>
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4AF37' }}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#D4AF37' }}>Active</span>
                            </div>
                        </div>

                        {/* Photo Gallery */}
                        <div className="mb-6 relative">
                            <div className="w-full h-[308px] rounded-[6px] overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                <img
                                    src={FRANCHISE_IMAGES[currentFranchiseId]?.[activePhotoIndex] || FALLBACK_IMAGE}
                                    alt={`${franchiseName} - ${PHOTO_LABELS[currentFranchiseId]?.[activePhotoIndex] || 'Photo'}`}
                                    className="w-full h-full object-cover"
                                    style={{ transition: photoTransition ? 'opacity 600ms ease-in-out' : 'none' }}
                                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                />
                                {FRANCHISE_IMAGES[currentFranchiseId] && FRANCHISE_IMAGES[currentFranchiseId].length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setActivePhotoIndex((prev) => (prev === 0 ? FRANCHISE_IMAGES[currentFranchiseId].length - 1 : prev - 1))}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                                            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
                                        >
                                            <ChevronLeft size={16} className="text-white" />
                                        </button>
                                        <button
                                            onClick={() => setActivePhotoIndex((prev) => (prev === FRANCHISE_IMAGES[currentFranchiseId].length - 1 ? 0 : prev + 1))}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                                            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
                                        >
                                            <ChevronRight size={16} className="text-white" />
                                        </button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {FRANCHISE_IMAGES[currentFranchiseId].map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActivePhotoIndex(idx)}
                                                    className="w-1.5 h-1.5 rounded-full transition-all"
                                                    style={{ background: idx === activePhotoIndex ? '#D4AF37' : 'rgba(255,255,255,0.3)' }}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {PHOTO_LABELS[currentFranchiseId]?.[activePhotoIndex] && (
                                <div className="absolute top-3 left-3 px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(0,0,0,0.7)', color: '#FFFFFF' }}>
                                    {PHOTO_LABELS[currentFranchiseId][activePhotoIndex]}
                                </div>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Market Cap</p>
                                <p className="text-lg font-bold text-white">{marketCap}</p>
                            </div>
                            <div className="p-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Dividend Pool</p>
                                <p className="text-lg font-bold text-white">${pendingPool ? Number(formatUnits(pendingPool, 18)).toFixed(2) : '0.00'}</p>
                            </div>
                            <div className="p-3 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Your Pending</p>
                                <p className="text-lg font-bold" style={{ color: '#D4AF37' }}>${pendingDividend ? Number(formatUnits(pendingDividend, 18)).toFixed(2) : '0.00'}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8A8F98' }}>Funding Progress</span>
                                <span className="text-xs font-bold text-white">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#D4AF37', boxShadow: '0 0 8px rgba(142,205,99,0.4)' }}></div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[9px]" style={{ color: '#8A8F98' }}>{currentSupply.toLocaleString()} / {maxSupply.toLocaleString()} units</span>
                            </div>
                        </div>

                        {/* Purchase Panel */}
                        <div className="p-4 rounded-[6px]" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8A8F98' }}>Purchase Amount</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPurchaseQuantity((prev) => Math.max(0, Number(prev) - 100).toString())}
                                        className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                    >
                                        <Minus size={12} className="text-white" />
                                    </button>
                                    <input
                                        type="number"
                                        value={purchaseQuantity}
                                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                                        className="w-24 h-8 px-3 text-center text-sm font-bold rounded-[6px] transition-all"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212, 175, 55, 0.12)', color: '#FFFFFF' }}
                                        onFocus={e => (e.currentTarget.style.borderColor = '#D4AF37')}
                                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                                    />
                                    <button
                                        onClick={() => setPurchaseQuantity((prev) => (Number(prev) + 100).toString())}
                                        className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                    >
                                        <Plus size={12} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs" style={{ color: '#8A8F98' }}>Total (USDC)</span>
                                <span className="text-lg font-bold text-white">${Number(formatUnits(calculatedTotalPrice, 18)).toFixed(2)}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleInvest}
                                    disabled={!isConnected || isInvesting || isWaitingForTx || isFranchiseLoading}
                                    className="flex-1 h-12 rounded-[10px] text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #DFBA73 0%, #C5A059 50%, #B89753 100%)',
                                        color: '#ffffff',
                                        boxShadow: '0px 4px 12px rgba(184, 151, 83, 0.3)',
                                    }}
                                    onMouseEnter={e => {
                                        if (!e.currentTarget.disabled) {
                                            e.currentTarget.style.boxShadow = '0px 6px 20px rgba(184, 151, 83, 0.45)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = '0px 4px 12px rgba(184, 151, 83, 0.3)';
                                    }}
                                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    {!isConnected ? 'Connect Wallet' : isInvesting || isWaitingForTx ? 'Processing...' : isCcipMode ? 'Purchase via CCIP' : 'Purchase Tokens'}
                                </button>
                                {pendingDividend !== undefined && pendingDividend > 0n && (
                                    <button
                                        onClick={handleClaim}
                                        disabled={!isConnected || isInvesting || isWaitingForTx}
                                        className="h-10 px-6 rounded-[16px] text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212, 175, 55, 0.12)', color: '#FFFFFF' }}
                                        onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                    >
                                        Claim ${Number(formatUnits(pendingDividend, 18)).toFixed(2)}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Sidebar: My Portfolio + Dividend History + Recent Transactions */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
                    {/* My Portfolio */}
                    <div className="flex-1 min-h-0">
                        <ActiveInvestments userTokens={userTokens} franchiseName={franchiseName} />
                    </div>

                    {/* Dividend History */}
                    <div className="flex-1 min-h-0" style={{ 
                        background: 'rgba(20, 26, 38, 0.75)', 
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(212, 175, 55, 0.12)', 
                        borderRadius: '20px', 
                        padding: '20px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
                    }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 style={{ fontSize: '11px', fontWeight: 500, color: '#8A8F98', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dividend History</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: '#D4AF37' }}>
                                <TrendingUp size={12} />
                                <span>+24% vs last cycle</span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                            <AreaChart data={liveRewardsData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Cycle #{currentCycle ? currentCycle.toString() : '0'}</p>
                                <p className="text-sm font-bold text-white">${historicalCycles ? Number(formatUnits(historicalCycles.totalAmount, 18)).toFixed(2) : '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Per Token</p>
                                <p className="text-sm font-bold text-white">${historicalCycles ? Number(formatUnits(historicalCycles.perTokenPayout, 18)).toFixed(4) : '0.0000'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8A8F98' }}>Interval</p>
                                <p className="text-sm font-bold text-white">{distributionInterval ? `${(Number(distributionInterval) / 86400).toFixed(4)}d` : 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="flex-1 min-h-0">
                        <TransactionList />
                    </div>
                </div>

            </div>

            {/* Connect Wallet CTA */}
            {!isConnected && (
                <div className="w-full p-8 rounded-[6px] text-center" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}>
                    <WalletIcon size={32} className="mx-auto mb-4" style={{ color: '#D4AF37' }} />
                    <h3 className="text-lg font-bold text-white mb-2">Connect Your Wallet</h3>
                    <p className="text-sm mb-6" style={{ color: '#8A8F98' }}>Start investing in real-world assets on Base Sepolia or Ethereum Sepolia (via CCIP)</p>
                    <WalletButton />
                </div>
            )}

        </div>
    );
}
