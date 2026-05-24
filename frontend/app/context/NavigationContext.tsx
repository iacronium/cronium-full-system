'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type SectionId = 'home' | 'explore' | 'portfolio' | 'marketplace' | 'rewards' | 'settings' | 'admin';

interface NavigationContextValue {
    activeSection: SectionId;
    setActiveSection: (id: SectionId) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
    activeSection: 'home',
    setActiveSection: () => {},
    isMobileMenuOpen: false,
    setIsMobileMenuOpen: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [activeSection, setActiveSection] = useState<SectionId>('home');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSetActiveSection = (id: SectionId) => {
        setActiveSection(id);
        setIsMobileMenuOpen(false);
    };

    return (
        <NavigationContext.Provider value={{
            activeSection,
            setActiveSection: handleSetActiveSection,
            isMobileMenuOpen,
            setIsMobileMenuOpen
        }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    return useContext(NavigationContext);
}
