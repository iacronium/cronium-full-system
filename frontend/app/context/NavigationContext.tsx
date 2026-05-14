'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type SectionId = 'home' | 'explore' | 'portfolio' | 'rewards' | 'settings';

interface NavigationContextValue {
    activeSection: SectionId;
    setActiveSection: (id: SectionId) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
    activeSection: 'home',
    setActiveSection: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [activeSection, setActiveSection] = useState<SectionId>('home');
    return (
        <NavigationContext.Provider value={{ activeSection, setActiveSection }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    return useContext(NavigationContext);
}
