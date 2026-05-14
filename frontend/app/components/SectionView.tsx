'use client';

/**
 * SectionView — animated section switcher with macOS-style transitions.
 *
 * When the active section changes:
 *   1. The current content fades out + scales down slightly (like closing a window)
 *   2. The new content fades in + scales up from 0.97 to 1.0
 *
 * Uses CSS transitions only — no external animation library needed.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigation, SectionId } from '../context/NavigationContext';
import AccountAbstractionDemo from '../AccountAbstractionDemo';
import ExploreSection from './ExploreSection';
import PortfolioSection from './PortfolioSection';

// Placeholder for sections not yet implemented
function ComingSoon({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <span className="text-2xl">🚧</span>
            </div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
            <p className="text-white/40 text-sm">This section is coming soon.</p>
        </div>
    );
}

function renderSection(id: SectionId) {
    switch (id) {
        case 'home':     return <AccountAbstractionDemo />;
        case 'explore':  return <ExploreSection />;
        case 'portfolio': return <PortfolioSection />;
        case 'rewards':  return <ComingSoon title="Rewards" />;
        case 'settings': return <ComingSoon title="Settings" />;
    }
}

export default function SectionView() {
    const { activeSection } = useNavigation();

    // Track the section being displayed vs the one being transitioned to
    const [displayedSection, setDisplayedSection] = useState<SectionId>(activeSection);
    const [visible, setVisible] = useState(true);
    const pendingSection = useRef<SectionId>(activeSection);

    useEffect(() => {
        if (activeSection === displayedSection) return;

        pendingSection.current = activeSection;

        // Step 1: fade out current content
        setVisible(false);

        // Step 2: after fade-out completes, swap content and fade in
        const timer = setTimeout(() => {
            setDisplayedSection(pendingSection.current);
            window.scrollTo(0, 0);
            setVisible(true);
        }, 180); // matches the CSS transition duration below

        return () => clearTimeout(timer);
    }, [activeSection, displayedSection]);

    return (
        <div
            style={{
                transition: 'opacity 180ms ease, transform 180ms ease',
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1) translateY(0)' : 'scale(0.98) translateY(6px)',
                transformOrigin: 'top center',
            }}
        >
            {renderSection(displayedSection)}
        </div>
    );
}
