'use client';

import { Home, Briefcase, Compass, Gift, Settings, Server, Store } from 'lucide-react';
import { useNavigation, SectionId } from '../context/NavigationContext';
import { useEffect, useState } from 'react';

const navItems: { name: string; icon: React.ElementType; id: SectionId }[] = [
    { name: 'Home',         icon: Home,      id: 'home' },
    { name: 'My Portfolio', icon: Briefcase, id: 'portfolio' },
    { name: 'Explore',      icon: Compass,   id: 'explore' },
    { name: 'Marketplace',  icon: Store,     id: 'marketplace' },
    { name: 'Rewards',      icon: Gift,      id: 'rewards' },
    { name: 'Settings',     icon: Settings,  id: 'settings' },
    { name: 'Admin',        icon: Server,    id: 'admin' },
];

export default function Sidebar() {
    const { activeSection, setActiveSection } = useNavigation();
    const [ready, setReady] = useState(false);

    // Trigger entrance animation after mount
    useEffect(() => {
        const t = setTimeout(() => setReady(true), 30);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            {/* Entrance animation keyframes */}
            <style>{`
                @keyframes sidebar-slide-in {
                    from { transform: translateX(-100%); opacity: 0; }
                    to   { transform: translateX(0);     opacity: 1; }
                }
                @keyframes logo-reveal {
                    0%   { opacity: 0; transform: scale(0.85) translateY(-6px); filter: blur(4px); }
                    60%  { opacity: 1; transform: scale(1.04) translateY(0);    filter: blur(0); }
                    100% { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0); }
                }
                @keyframes logo-text-reveal {
                    0%   { opacity: 0; transform: translateX(-12px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes nav-item-in {
                    from { opacity: 0; transform: translateX(-10px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes gold-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
                    50%      { box-shadow: 0 0 12px 2px rgba(212,175,55,0.15); }
                }
            `}</style>

            <aside
                className="fixed left-0 top-0 bottom-0 z-[100] flex flex-col"
                style={{
                    width: '220px',
                    background: 'rgba(15, 17, 23, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(212, 175, 55, 0.12)',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
                    animation: ready ? 'sidebar-slide-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both' : 'none',
                }}
            >
                {/* ── Logo area ── */}
                <div
                    className="flex items-center gap-3 shrink-0"
                    style={{
                        height: '60px',
                        padding: '0 18px',
                        borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
                    }}
                >
                    {/* Icon — bouncy scale reveal */}
                    <div
                        style={{
                            animation: ready ? 'logo-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' : 'none',
                            flexShrink: 0,
                        }}
                    >
                        <img
                            src="/cronium-icon.svg"
                            alt="Cronium icon"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                animation: ready ? 'gold-pulse 3s ease-in-out 1s infinite' : 'none',
                            }}
                        />
                    </div>

                    {/* Logo image — slides in from left */}
                    <div
                        style={{
                            animation: ready ? 'logo-text-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both' : 'none',
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <img
                            src="/cronium-logo.png"
                            alt="Cronium"
                            style={{
                                height: '26px',
                                width: 'auto',
                                objectFit: 'contain',
                                objectPosition: 'left center',
                                maxWidth: '130px',
                            }}
                        />
                    </div>

                    {/* RWA badge */}
                    <span
                        style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#D4AF37',
                            background: 'rgba(212,175,55,0.1)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid rgba(212,175,55,0.2)',
                            letterSpacing: '0.06em',
                            flexShrink: 0,
                            animation: ready ? 'logo-text-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both' : 'none',
                        }}
                    >
                        RWA
                    </span>
                </div>

                {/* ── Nav ── */}
                <nav className="flex flex-col flex-1" style={{ padding: '10px 8px' }}>
                    {navItems.map((item, i) => {
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className="flex items-center gap-3 w-full text-left relative transition-all"
                                style={{
                                    height: '36px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? '#D4AF37' : '#8A99AD',
                                    background: isActive ? 'rgba(212,175,55,0.08)' : 'transparent',
                                    borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                                    cursor: 'pointer',
                                    marginBottom: '2px',
                                    transition: 'all 150ms ease-out',
                                    animation: ready
                                        ? `nav-item-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.4 + i * 0.05}s both`
                                        : 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                                        (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLButtonElement).style.color = '#8A99AD';
                                    }
                                }}
                            >
                                <item.icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                                <span>{item.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* ── Footer ── */}
                <div
                    style={{
                        padding: '14px 18px',
                        borderTop: '1px solid rgba(212,175,55,0.08)',
                        animation: ready ? 'logo-text-reveal 0.4s ease 0.9s both' : 'none',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#10B981',
                            boxShadow: '0 0 6px rgba(16,185,129,0.6)',
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            MiCA Compliant
                        </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8A99AD', fontFamily: 'monospace', marginTop: '4px' }}>
                        Base Sepolia
                    </div>
                </div>
            </aside>
        </>
    );
}
