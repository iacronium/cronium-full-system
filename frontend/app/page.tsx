"use client";

import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import SectionView from "./components/SectionView";
import { NavigationProvider, useNavigation } from "./context/NavigationContext";

function MainLayout() {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useNavigation();

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-inter selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10vw] left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed top-[20vh] right-[10vw] w-[30vw] h-[30vw] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none z-0"></div>

      {/* Responsive Layout Styles */}
      <style>{`
        .main-content {
          margin-left: 220px;
          margin-top: 60px;
          transition: margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .footer-content {
          margin-left: 220px;
          transition: margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .main-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 32px;
          transition: padding 0.3s ease;
        }
        @media (max-width: 1023px) {
          .main-content {
            margin-left: 0 !important;
          }
          .footer-content {
            margin-left: 0 !important;
          }
          .main-container {
            padding: 16px 12px !important;
          }
        }
      `}</style>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar />
      <TopNav />

      <main className="min-h-screen relative z-10 main-content">
        <div className="main-container">
          <SectionView />
        </div>
      </main>

      <footer
        className="text-center footer-content"
        style={{
          padding: '16px 32px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '12px',
          color: '#4E4E56',
          fontFamily: 'monospace',
        }}
      >
        © 2026 Cronium RWA · Base Sepolia · v0.1.0
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <NavigationProvider>
      <MainLayout />
    </NavigationProvider>
  );
}
