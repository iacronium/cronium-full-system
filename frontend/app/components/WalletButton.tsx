'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';

// Chain IDs for supported networks
const BASE_SEPOLIA_ID = 84532;
const ETH_SEPOLIA_ID = 11155111;

export default function WalletButton() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted: rkMounted }) => {
                const ready = rkMounted;
                const connected = ready && account && chain;

                // Eth Sepolia is valid — user operates via CCIP bridge
                const isCcipChain = chain?.id === ETH_SEPOLIA_ID;
                const isNativeChain = chain?.id === BASE_SEPOLIA_ID;
                // Any other chain is truly unsupported
                const isUnsupported = connected && !isCcipChain && !isNativeChain;

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                        })}
                    >
                        {!connected ? (
                            <button
                                onClick={openConnectModal}
                                style={{
                                    height: '28px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#171723',
                                    background: '#8ECD63',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(142,205,99,0.25)',
                                    transition: 'background 150ms ease-out',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#7ab854')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#8ECD63')}
                            >
                                Connect Wallet
                            </button>
                        ) : isUnsupported ? (
                            // Truly unsupported chain — prompt to switch
                            <button
                                onClick={openChainModal}
                                style={{
                                    height: '28px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#FFFFFF',
                                    background: 'rgba(129,181,128,0.15)',
                                    border: '1px solid rgba(129,181,128,0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease-out',
                                }}
                            >
                                Wrong Network
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Chain selector — shows CCIP badge when on Eth Sepolia */}
                                <button
                                    onClick={openChainModal}
                                    style={{
                                        height: '28px',
                                        padding: '0 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: isCcipChain ? '#8ECD63' : '#8A8F98',
                                        background: isCcipChain
                                            ? 'rgba(142,205,99,0.08)'
                                            : 'rgba(255,255,255,0.04)',
                                        border: isCcipChain
                                            ? '1px solid rgba(142,205,99,0.25)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 150ms ease-out',
                                    }}
                                    title={isCcipChain ? 'Operating via Chainlink CCIP bridge' : chain.name}
                                >
                                    {chain.hasIcon && chain.iconUrl && (
                                        <img src={chain.iconUrl} alt={chain.name} style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                                    )}
                                    <span className="hidden lg:block">
                                        {isCcipChain ? 'CCIP Mode' : chain.name}
                                    </span>
                                    {isCcipChain && (
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            color: '#8ECD63',
                                            background: 'rgba(142,205,99,0.15)',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                        }}>
                                            ⚡
                                        </span>
                                    )}
                                </button>

                                {/* Account */}
                                <button
                                    onClick={openAccountModal}
                                    style={{
                                        height: '28px',
                                        padding: '0 10px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: '#FFFFFF',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                        transition: 'all 150ms ease-out',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                >
                                    {account.displayName}
                                </button>
                            </div>
                        )}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
