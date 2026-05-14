'use client';

import { Search, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import WalletButton from './WalletButton';

export default function TopNav() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    return (
        <header
            className="fixed top-0 right-0 z-[90] flex items-center justify-between"
            style={{
                left: '240px',
                height: '56px',
                padding: '0 24px',
                background: '#171723',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            {/* Left: logo + nav */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <img src="/cronium-logo.png" alt="Cronium" className="h-6 w-auto object-contain" />
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    {['Overview', 'Markets', 'Portfolio'].map((item, i) => (
                        <button
                            key={item}
                            className="transition-all"
                            style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '4px',
                                fontSize: '13px',
                                fontWeight: i === 0 ? 500 : 400,
                                color: i === 0 ? '#FFFFFF' : '#8A8F98',
                                background: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <button
                    className="flex items-center gap-2 transition-all"
                    style={{
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#8A8F98',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                    }}
                >
                    <Search size={13} />
                    <span className="hidden lg:block">Search</span>
                    <span
                        className="hidden lg:block"
                        style={{
                            fontSize: '11px',
                            color: '#4E4E56',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontFamily: 'monospace',
                        }}
                    >
                        ⌘K
                    </span>
                </button>

                {/* Bell */}
                <button
                    className="relative transition-all"
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8A8F98',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                    }}
                >
                    <Bell size={13} />
                    <span
                        className="absolute"
                        style={{
                            top: '5px',
                            right: '5px',
                            width: '5px',
                            height: '5px',
                            background: '#8ECD63',
                            borderRadius: '50%',
                            border: '1px solid #171723',
                        }}
                    />
                </button>

                {/* Divider */}
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

                {mounted && <WalletButton />}
            </div>
        </header>
    );
}
