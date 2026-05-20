'use client';

import { Search, Bell, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import WalletButton from './WalletButton';

export default function TopNav() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    return (
        <header
            className="fixed top-0 right-0 z-[90] flex items-center justify-between"
            style={{
                left: '220px',
                height: '60px',
                padding: '0 24px',
                background: 'rgba(15, 17, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(212, 175, 55, 0.12)',
                boxShadow: '0 1px 0 rgba(212,175,55,0.05)',
            }}
        >
            {/* Left: nav tabs */}
            <nav className="hidden md:flex items-center gap-1">
                {['Overview', 'Markets', 'Portfolio'].map((item, i) => (
                    <button
                        key={item}
                        className="transition-all"
                        style={{
                            height: '30px',
                            padding: '0 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: i === 0 ? 600 : 400,
                            color: i === 0 ? '#FFFFFF' : '#8A99AD',
                            background: i === 0 ? 'rgba(212,175,55,0.08)' : 'transparent',
                            border: i === 0 ? '1px solid rgba(212,175,55,0.15)' : '1px solid transparent',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                            if (i !== 0) {
                                (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (i !== 0) {
                                (e.currentTarget as HTMLButtonElement).style.color = '#8A99AD';
                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            }
                        }}
                    >
                        {item}
                    </button>
                ))}
            </nav>

            {/* Right: compliance + actions */}
            <div className="flex items-center gap-2">

                {/* MiCA badge */}
                <div
                    className="hidden lg:flex items-center gap-2"
                    style={{
                        height: '26px',
                        padding: '0 10px',
                        borderRadius: '9999px',
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}
                >
                    <span style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: '#10B981',
                        boxShadow: '0 0 5px rgba(16,185,129,0.7)',
                    }} />
                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        KYC Verified
                    </span>
                </div>

                {/* Search */}
                <button
                    className="flex items-center gap-2 transition-all"
                    style={{
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#8A99AD',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(212,175,55,0.1)',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.1)')}
                >
                    <Search size={13} />
                    <span className="hidden lg:block">Search</span>
                    <span className="hidden lg:block" style={{
                        fontSize: '10px', color: '#4E4E56',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace',
                    }}>⌘K</span>
                </button>

                {/* Bell */}
                <button
                    className="relative transition-all"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#8A99AD',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(212,175,55,0.1)',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.1)')}
                >
                    <Bell size={13} />
                    <span className="absolute" style={{
                        top: '5px', right: '5px',
                        width: '5px', height: '5px',
                        background: '#D4AF37', borderRadius: '50%',
                        border: '1px solid rgba(15,17,23,0.95)',
                    }} />
                </button>

                {/* Divider */}
                <div style={{ width: '1px', height: '20px', background: 'rgba(212,175,55,0.1)', margin: '0 4px' }} />

                {mounted && <WalletButton />}
            </div>
        </header>
    );
}
