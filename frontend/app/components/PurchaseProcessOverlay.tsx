import React from 'react';
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export type TxStep = 'idle' | 'signing' | 'confirming' | 'success' | 'error';

interface PurchaseProcessOverlayProps {
    step: TxStep;
    onClose: () => void;
    isCcip: boolean;
}

export default function PurchaseProcessOverlay({ step, onClose, isCcip }: PurchaseProcessOverlayProps) {
    if (step === 'idle') return null;

    const iconContent = step === 'success' ? (
        <CheckCircle2 size={40} className="text-white drop-shadow-md" />
    ) : step === 'error' ? (
        <ShieldAlert size={40} className="text-white drop-shadow-md" />
    ) : (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="44" 
            height="44" 
            viewBox="0 0 11518.39 14379.1"
            className="text-white drop-shadow-md"
            fill="currentColor"
        >
            <path d="M231.17 6482.73c-259.31,143.16 -298.65,509.45 -127.1,750.91l1932.47 2720c171.55,241.46 473.83,231.71 750.9,127.11 1134.62,-428.31 1722.69,-241.43 2553.75,-1410.32 831.06,-1168.89 1979.15,-3291.65 2968.74,-4937.46 152.57,-253.74 298.61,-509.52 127.11,-750.9l-1932.47 -2720.01c-171.5,-241.38 -598.21,-380.9 -750.91,-127.1l-2972.44 4940.08c-486.93,809.27 -1700.04,938.45 -2550.05,1407.68z"/>
            <path d="M3235.24 10711.02c-259.32,143.15 -298.66,509.45 -127.11,750.91l1932.47 2720c171.55,241.46 473.83,231.71 750.91,127.1 1134.61,-428.31 1722.69,-241.43 2553.74,-1410.32 831.06,-1168.88 1979.15,-3291.64 2968.74,-4937.45 152.57,-253.74 298.6,-509.52 127.1,-750.91l-1932.47 -2720c-171.5,-241.39 -598.21,-380.9 -750.91,-127.1l-2972.44 4940.08c-486.93,809.27 -1700.03,938.45 -2550.04,1407.69z"/>
        </svg>
    );

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[24px] overflow-hidden" style={{ background: 'rgba(23, 23, 35, 0.95)', backdropFilter: 'blur(10px)' }}>
            
            {/* 3D Coin Animation */}
            <div className="relative w-32 h-32 mb-8 perspective-1000">
                <div className={`w-full h-full rounded-full flex items-center justify-center transform-style-3d ${step === 'success' || step === 'error' ? '' : 'animate-spin-slow'}`} style={{
                    background: 'linear-gradient(135deg, #8ECD63 0%, #4C9185 100%)',
                    boxShadow: '0 0 30px rgba(142,205,99,0.5), inset 0 0 20px rgba(255,255,255,0.5)',
                    border: '4px solid rgba(255,255,255,0.2)'
                }}>
                    {/* Front face */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ transform: 'translateZ(1px)', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {iconContent}
                        </div>
                    </div>
                    {/* Back face */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ transform: 'rotateY(180deg) translateZ(1px)', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {iconContent}
                        </div>
                    </div>
                </div>
                
                {/* Glow ring */}
                {step !== 'error' && <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#8ECD63' }}></div>}
            </div>

            {/* Status Texts */}
            <div className="text-center space-y-3 px-8">
                {step === 'signing' && (
                    <>
                        <h3 className="text-2xl font-black text-white tracking-tighter">Requesting Signature</h3>
                        <p className="text-sm font-medium text-white/50">Please confirm the transaction in your wallet to proceed with the purchase.</p>
                        <Loader2 className="animate-spin mx-auto mt-4 text-[#8ECD63]" size={24} />
                    </>
                )}
                {step === 'confirming' && (
                    <>
                        <h3 className="text-2xl font-black text-white tracking-tighter">{isCcip ? 'Bridging & Confirming' : 'Minting Tokens'}</h3>
                        <p className="text-sm font-medium text-white/50">{isCcip ? 'Waiting for Chainlink CCIP to bridge the transaction to Base Sepolia. This usually takes about 20 minutes.' : 'Transaction sent! Awaiting block confirmation on Base Sepolia...'}</p>
                        <div className="flex justify-center mt-4 gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#8ECD63] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-[#8ECD63] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-[#8ECD63] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </>
                )}
                {step === 'success' && (
                    <>
                        <h3 className="text-2xl font-black text-[#8ECD63] tracking-tighter">Purchase Successful!</h3>
                        <p className="text-sm font-medium text-white/50">Your fractional NFT assets have been successfully minted to your portfolio.</p>
                        <button 
                            onClick={onClose}
                            className="mt-6 px-8 py-2 rounded-[16px] text-sm font-black uppercase tracking-widest transition-all hover:bg-[#8ECD63] hover:text-[#171723]"
                            style={{ background: 'rgba(142,205,99,0.15)', color: '#8ECD63', border: '1px solid rgba(142,205,99,0.3)' }}
                        >
                            Continue
                        </button>
                    </>
                )}
                {step === 'error' && (
                    <>
                        <h3 className="text-2xl font-black text-[#81B580] tracking-tighter">Transaction Failed</h3>
                        <p className="text-sm font-medium text-white/50">The transaction was rejected or encountered an error.</p>
                        <button 
                            onClick={onClose}
                            className="mt-6 px-8 py-2 rounded-[16px] text-sm font-black uppercase tracking-widest transition-all hover:bg-white hover:text-black"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
            
            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .animate-spin-slow {
                    animation: spin-y 2.5s linear infinite;
                }
                @keyframes spin-y {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(360deg); }
                }
            `}</style>
        </div>
    );
}
