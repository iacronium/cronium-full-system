'use client';

import { Home, Briefcase, Compass, Gift, Settings } from 'lucide-react';
import { useNavigation, SectionId } from '../context/NavigationContext';

const navItems: { name: string; icon: React.ElementType; id: SectionId }[] = [
    { name: 'Home',         icon: Home,      id: 'home' },
    { name: 'My Portfolio', icon: Briefcase, id: 'portfolio' },
    { name: 'Explore',      icon: Compass,   id: 'explore' },
    { name: 'Rewards',      icon: Gift,       id: 'rewards' },
    { name: 'Settings',     icon: Settings,  id: 'settings' },
];

export default function Sidebar() {
    const { activeSection, setActiveSection } = useNavigation();

    return (
        <aside
            className="fixed left-0 top-0 bottom-0 z-[100] flex flex-col"
            style={{
                width: '240px',
                background: '#1C1C28',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-3 shrink-0"
                style={{
                    height: '56px',
                    padding: '0 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <img src="/cronium-icon.svg" alt="Cronium" className="w-6 h-6 rounded" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    Cronium
                </span>
                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#8ECD63',
                        background: 'rgba(142,205,99,0.12)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                    }}
                >
                    RWA
                </span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col flex-1 py-2" style={{ padding: '8px 8px' }}>
                {navItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className="flex items-center gap-3 w-full text-left relative transition-all"
                            style={{
                                height: '32px',
                                padding: '0 12px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontWeight: isActive ? 500 : 400,
                                color: isActive ? '#8ECD63' : '#8A8F98',
                                background: isActive ? 'rgba(142,205,99,0.1)' : 'transparent',
                                borderLeft: isActive ? '2px solid #8ECD63' : '2px solid transparent',
                                cursor: 'pointer',
                                marginBottom: '2px',
                                transition: 'all 150ms ease-out',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#8A8F98';
                                }
                            }}
                        >
                            <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                            <span>{item.name}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: '12px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '12px',
                    color: '#8A8F98',
                    fontFamily: 'monospace',
                }}
            >
                Base Sepolia
            </div>
        </aside>
    );
}
