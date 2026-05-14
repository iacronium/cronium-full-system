import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import SectionView from "./components/SectionView";
import { NavigationProvider } from "./context/NavigationContext";

export default function Home() {
  return (
    <NavigationProvider>
      <div className="min-h-screen bg-[#1a1a1a] text-white font-inter selection:bg-cyan-500/30 overflow-x-hidden">
        {/* Background Glows */}
        <div className="fixed top-[-10vw] left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10vw] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed top-[20vh] right-[10vw] w-[30vw] h-[30vw] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none z-0"></div>

        <Sidebar />
        <TopNav />

        <main
          className="min-h-screen relative z-10"
          style={{ marginLeft: '240px', marginTop: '56px' }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
            <SectionView />
          </div>
        </main>

        <footer
          className="text-center"
          style={{
            marginLeft: '240px',
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
    </NavigationProvider>
  );
}
