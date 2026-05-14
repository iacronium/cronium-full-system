'use client';

/**
 * Design System Preview — Cronium RWA Platform
 * Ruta: /design-preview
 *
 * Muestra dos variantes del mismo componente "Franchise Card":
 *   - Opción A: Light Mode (Base design system puro — fondo blanco, azul #0000FF)
 *   - Opción B: Dark Mode adaptado (fondo #030712, azul #0000FF reemplaza cyan)
 */

export default function DesignPreview() {
    return (
        <div className="min-h-screen bg-[#F2F2F2] p-8 font-sans">
            <div className="max-w-[1400px] mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-2">
                    <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#717886]">
                        Design System Preview
                    </p>
                    <h1 className="text-[32px] font-normal text-[#000000] leading-[36px]">
                        Cronium RWA — Selección de Estilo
                    </h1>
                    <p className="text-[16px] text-[#717886] max-w-xl">
                        Compara las dos variantes del design system aplicadas al mismo componente.
                        Elige la que mejor represente la plataforma.
                    </p>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* ── OPCIÓN A: LIGHT MODE ─────────────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-[#0000FF] text-white text-[12px] font-bold px-3 py-1 rounded-[16px]">
                                Opción A
                            </span>
                            <span className="text-[14px] font-bold text-[#000000]">Light Mode — Base Design System</span>
                        </div>

                        {/* Light card */}
                        <div className="bg-white border border-[#E5E7EB] rounded-[9px] shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">

                            {/* Top nav bar */}
                            <div className="h-[64px] bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-[#0000FF] rounded-[8px]" />
                                    <span className="text-[16px] font-semibold text-[#000000]">Cronium</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-[#717886] bg-[#F2F2F2] border border-[#D1D5DB] px-3 py-1 rounded-[16px]">
                                        Base Sepolia
                                    </span>
                                    <div className="h-[36px] bg-[#0000FF] text-white text-[14px] font-semibold px-4 rounded-[8px] flex items-center shadow-[0px_2px_8px_rgba(0,0,255,0.15)] hover:bg-[#0000D9] cursor-pointer">
                                        Connect Wallet
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 bg-[#F9FAFB]">

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Portfolio Value', value: '$2,200.00', sub: '22 units owned' },
                                        { label: 'Claimable Rewards', value: '$0.00', sub: 'mUSDC pending' },
                                        { label: 'Native Balance', value: '0.1679 ETH', sub: 'Base Sepolia' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white border border-[#E5E7EB] rounded-[9px] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
                                            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#717886] mb-1">{stat.label}</p>
                                            <p className="text-[24px] font-bold text-[#000000] leading-tight">{stat.value}</p>
                                            <p className="text-[12px] text-[#9CA3AF] mt-1">{stat.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Franchise card */}
                                <div className="bg-white border border-[#E5E7EB] rounded-[9px] p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.08)]">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#717886] mb-1">Franchise Asset</p>
                                            <h2 className="text-[32px] font-normal text-[#000000] leading-[36px]">Cronium Burger #1</h2>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[12px] text-[#717886]">Franchise ID: #1</span>
                                                <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                                                <span className="text-[12px] text-[#717886]">Mkt Cap: $100,000</span>
                                            </div>
                                        </div>
                                        <span className="bg-[#1FBF89] text-white text-[12px] font-bold px-3 py-1 rounded-[16px]">
                                            14.2% APR
                                        </span>
                                    </div>

                                    {/* Progress */}
                                    <div className="mb-5">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-[14px] font-bold text-[#000000]">22 <span className="text-[#717886] font-normal">/ 1,000 tokens</span></span>
                                            <span className="text-[12px] font-bold text-[#0000FF]">2.2% Sold</span>
                                        </div>
                                        <div className="h-2 bg-[#F2F2F2] rounded-full border border-[#E5E7EB] overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: 'max(2.2%, 4px)', background: '#0000FF', boxShadow: '0px 0px 8px rgba(0,0,255,0.4)' }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[12px] text-[#9CA3AF]">0%</span>
                                            <span className="text-[12px] text-[#9CA3AF]">978 remaining</span>
                                            <span className="text-[12px] text-[#9CA3AF]">100%</span>
                                        </div>
                                    </div>

                                    {/* Input + button */}
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-[14px] font-bold text-[#000000] mb-2">Quantity</label>
                                            <input
                                                type="number"
                                                defaultValue="100"
                                                className="w-full h-[44px] bg-white border border-[#D1D5DB] rounded-[50px] px-4 text-[16px] text-[#000000] outline-none focus:border-[#0000FF] focus:shadow-[0px_0px_0px_3px_rgba(0,0,255,0.1)] transition-all"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[14px] font-bold text-[#000000] mb-2">Total (USDC)</label>
                                            <div className="h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[50px] px-4 flex items-center text-[16px] font-bold text-[#000000]">
                                                $10,000.00
                                            </div>
                                        </div>
                                    </div>

                                    <button className="mt-4 w-full h-[44px] bg-[#0000FF] text-white text-[16px] font-semibold rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,255,0.15)] hover:bg-[#0000D9] hover:shadow-[0px_4px_12px_rgba(0,0,255,0.25)] transition-all">
                                        Comprar Fracción
                                    </button>
                                </div>

                                {/* KYC badge */}
                                <div className="flex items-center gap-3">
                                    <span className="bg-[#1FBF89] text-white text-[12px] font-bold px-3 py-1 rounded-[16px]">
                                        ✓ Demo Mode Active
                                    </span>
                                    <span className="text-[12px] text-[#717886]">KYC bypassed for testing</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[12px] text-[#717886] leading-relaxed">
                            ✦ Fondo blanco · Azul #0000FF · Tipografía negra · Bordes sutiles · Sombras suaves
                        </p>
                    </div>

                    {/* ── OPCIÓN B: DARK MODE ADAPTADO ─────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-[#030712] text-white text-[12px] font-bold px-3 py-1 rounded-[16px] border border-[#374151]">
                                Opción B
                            </span>
                            <span className="text-[14px] font-bold text-[#000000]">Dark Mode — Base tokens adaptados</span>
                        </div>

                        {/* Dark card */}
                        <div className="bg-[#030712] border border-[#374151] rounded-[9px] shadow-[0px_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">

                            {/* Top nav bar */}
                            <div className="h-[64px] bg-[#030712] border-b border-[#374151] px-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-[#0000FF] rounded-[8px]" />
                                    <span className="text-[16px] font-semibold text-white">Cronium</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-[#717886] bg-[#374151] border border-[#4B5563] px-3 py-1 rounded-[16px]">
                                        Base Sepolia
                                    </span>
                                    <div className="h-[36px] bg-[#0000FF] text-white text-[14px] font-semibold px-4 rounded-[8px] flex items-center shadow-[0px_2px_8px_rgba(0,0,255,0.3)] cursor-pointer hover:bg-[#0000D9]">
                                        Connect Wallet
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Portfolio Value', value: '$2,200.00', sub: '22 units owned' },
                                        { label: 'Claimable Rewards', value: '$0.00', sub: 'mUSDC pending' },
                                        { label: 'Native Balance', value: '0.1679 ETH', sub: 'Base Sepolia' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-[#0a0a0a] border border-[#374151] rounded-[9px] p-4 shadow-[0px_2px_8px_rgba(0,0,0,0.3)]">
                                            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#717886] mb-1">{stat.label}</p>
                                            <p className="text-[24px] font-bold text-white leading-tight">{stat.value}</p>
                                            <p className="text-[12px] text-[#4B5563] mt-1">{stat.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Franchise card */}
                                <div className="bg-[#0a0a0a] border border-[#374151] rounded-[9px] p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.4)]">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#717886] mb-1">Franchise Asset</p>
                                            <h2 className="text-[32px] font-normal text-white leading-[36px]">Cronium Burger #1</h2>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[12px] text-[#717886]">Franchise ID: #1</span>
                                                <span className="w-1 h-1 rounded-full bg-[#374151]" />
                                                <span className="text-[12px] text-[#717886]">Mkt Cap: $100,000</span>
                                            </div>
                                        </div>
                                        <span className="bg-[#1FBF89] text-white text-[12px] font-bold px-3 py-1 rounded-[16px]">
                                            14.2% APR
                                        </span>
                                    </div>

                                    {/* Progress */}
                                    <div className="mb-5">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-[14px] font-bold text-white">22 <span className="text-[#717886] font-normal">/ 1,000 tokens</span></span>
                                            <span className="text-[12px] font-bold text-[#0000FF]">2.2% Sold</span>
                                        </div>
                                        <div className="h-2 bg-[#374151] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: 'max(2.2%, 4px)', background: '#0000FF', boxShadow: '0px 0px 10px rgba(0,0,255,0.6)' }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[12px] text-[#4B5563]">0%</span>
                                            <span className="text-[12px] text-[#4B5563]">978 remaining</span>
                                            <span className="text-[12px] text-[#4B5563]">100%</span>
                                        </div>
                                    </div>

                                    {/* Input + button */}
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-[14px] font-bold text-white mb-2">Quantity</label>
                                            <input
                                                type="number"
                                                defaultValue="100"
                                                className="w-full h-[44px] bg-[#030712] border border-[#374151] rounded-[50px] px-4 text-[16px] text-white outline-none focus:border-[#0000FF] focus:shadow-[0px_0px_0px_3px_rgba(0,0,255,0.15)] transition-all placeholder-[#4B5563]"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[14px] font-bold text-white mb-2">Total (USDC)</label>
                                            <div className="h-[44px] bg-[#374151] border border-[#4B5563] rounded-[50px] px-4 flex items-center text-[16px] font-bold text-white">
                                                $10,000.00
                                            </div>
                                        </div>
                                    </div>

                                    <button className="mt-4 w-full h-[44px] bg-[#0000FF] text-white text-[16px] font-semibold rounded-[8px] shadow-[0px_2px_8px_rgba(0,0,255,0.3)] hover:bg-[#0000D9] hover:shadow-[0px_4px_12px_rgba(0,0,255,0.5)] transition-all">
                                        Comprar Fracción
                                    </button>
                                </div>

                                {/* KYC badge */}
                                <div className="flex items-center gap-3">
                                    <span className="bg-[#1FBF89] text-white text-[12px] font-bold px-3 py-1 rounded-[16px]">
                                        ✓ Demo Mode Active
                                    </span>
                                    <span className="text-[12px] text-[#717886]">KYC bypassed for testing</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[12px] text-[#717886] leading-relaxed">
                            ✦ Fondo #030712 · Azul #0000FF · Tipografía blanca · Bordes #374151 · Glow effects
                        </p>
                    </div>
                </div>

                {/* Decision footer */}
                <div className="bg-white border border-[#E5E7EB] rounded-[9px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
                    <h3 className="text-[24px] font-normal text-[#000000] mb-4">¿Cuál prefieres?</h3>
                    <div className="grid grid-cols-2 gap-6 text-[14px]">
                        <div>
                            <p className="font-bold text-[#000000] mb-2">Opción A — Light Mode</p>
                            <ul className="space-y-1 text-[#717886]">
                                <li>✦ Más familiar para usuarios de finanzas tradicionales</li>
                                <li>✦ Mayor legibilidad en ambientes con luz</li>
                                <li>✦ Idéntico a Coinbase, Base, y apps fintech líderes</li>
                                <li>✦ Transmite confianza y profesionalismo institucional</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-[#000000] mb-2">Opción B — Dark Mode adaptado</p>
                            <ul className="space-y-1 text-[#717886]">
                                <li>✦ Estándar en plataformas DeFi y crypto</li>
                                <li>✦ Menor fatiga visual en sesiones largas</li>
                                <li>✦ Los colores neón destacan más sobre fondo oscuro</li>
                                <li>✦ Migración menos disruptiva del diseño actual</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
