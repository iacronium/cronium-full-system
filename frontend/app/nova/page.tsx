'use client';

/**
 * Nova Design System Demo
 * Premium fintech experience with liquid glassmorphism
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import WalletButton from '../components/WalletButton';
import {
    TrendingUp, ArrowUpRight, Activity, Wallet, CreditCard,
    Send, Download, MoreHorizontal, ChevronRight, Zap,
    Shield, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

// Mock data
const transactions = [
    { id: 1, type: 'Purchase', amount: '$1,250.00', status: 'completed', date: '2 hours ago', icon: ArrowUpRight },
    { id: 2, type: 'Dividend', amount: '$45.50', status: 'pending', date: '5 hours ago', icon: TrendingUp },
    { id: 3, type: 'Transfer', amount: '$500.00', status: 'completed', date: '1 day ago', icon: Send },
    { id: 4, type: 'Withdrawal', amount: '$2,000.00', status: 'completed', date: '2 days ago', icon: Download },
];

const stats = [
    { label: 'Total Balance', value: '$24,580.00', change: '+12.5%', trend: 'up' },
    { label: 'Monthly Revenue', value: '$3,240.00', change: '+8.2%', trend: 'up' },
    { label: 'Active Assets', value: '12', change: '+2', trend: 'up' },
];

export default function NovaDemo() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

    return (
        <div className="min-h-screen" style={{ background: '#F8FAFC', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif' }}>
            
            {/* Header */}
            <header className="sticky top-0 z-50" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E5E5E5' }}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <h1 className="text-2xl font-bold" style={{ color: '#0A0A0A', letterSpacing: '-0.3px' }}>Nova</h1>
                        <nav className="hidden md:flex items-center gap-6">
                            <button 
                                onClick={() => setActiveTab('overview')}
                                className="text-sm font-medium transition-colors"
                                style={{ 
                                    color: activeTab === 'overview' ? '#0000F5' : '#0A0A0A',
                                    fontWeight: activeTab === 'overview' ? 600 : 400
                                }}
                            >
                                Overview
                            </button>
                            <button 
                                onClick={() => setActiveTab('activity')}
                                className="text-sm font-medium transition-colors"
                                style={{ 
                                    color: activeTab === 'activity' ? '#0000F5' : '#0A0A0A',
                                    fontWeight: activeTab === 'activity' ? 600 : 400
                                }}
                            >
                                Activity
                            </button>
                        </nav>
                    </div>
                    <WalletButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                
                {/* Hero Section */}
                <div className="mb-12">
                    <h2 className="text-4xl font-bold mb-2" style={{ color: '#0A0A0A', letterSpacing: '-0.5px', lineHeight: '44px' }}>
                        Welcome back{isConnected && address ? `, ${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                    </h2>
                    <p className="text-base" style={{ color: '#CCCCCC', lineHeight: '24px' }}>
                        Here's what's happening with your investments today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {stats.map((stat, idx) => (
                        <div 
                            key={idx}
                            className="group cursor-pointer transition-all duration-200"
                            style={{
                                background: '#FFFFFF',
                                padding: '24px',
                                borderRadius: '16px',
                                border: '1px solid #E5E5E5',
                                boxShadow: 'rgba(15, 23, 42, 0.11) 0px 14px 40px 0px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = 'rgba(15, 23, 42, 0.15) 0px 20px 48px 0px';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = 'rgba(15, 23, 42, 0.11) 0px 14px 40px 0px';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <p className="text-xs font-medium mb-2" style={{ color: '#CCCCCC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {stat.label}
                            </p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-bold" style={{ color: '#0A0A0A', letterSpacing: '-0.5px' }}>
                                    {stat.value}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <TrendingUp size={16} style={{ color: '#22C55E' }} />
                                    <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>
                                        {stat.change}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Glass Card - Featured Asset */}
                    <div 
                        className="lg:col-span-2"
                        style={{
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            padding: '32px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.47)',
                            boxShadow: 'rgba(104, 155, 251, 0.2) 0px 16px 48px 0px'
                        }}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span 
                                        className="text-xs font-semibold px-3 py-1"
                                        style={{
                                            background: 'rgba(0, 0, 245, 0.1)',
                                            color: '#0000F5',
                                            borderRadius: '9999px',
                                            border: '1px solid #0000F5'
                                        }}
                                    >
                                        FEATURED
                                    </span>
                                    <span 
                                        className="text-xs font-semibold px-3 py-1"
                                        style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: '#22C55E',
                                            borderRadius: '9999px'
                                        }}
                                    >
                                        ACTIVE
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold mb-1" style={{ color: '#0A0A0A', letterSpacing: '-0.3px' }}>
                                    Cronium Burger #1
                                </h3>
                                <p className="text-sm" style={{ color: '#CCCCCC' }}>
                                    Tokenized real-world franchise ownership
                                </p>
                            </div>
                            <button 
                                className="transition-all duration-200"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '18px',
                                    background: 'rgba(0, 0, 0, 0)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 245, 0.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0)';
                                }}
                            >
                                <MoreHorizontal size={20} style={{ color: '#0A0A0A' }} />
                            </button>
                        </div>

                        {/* Asset Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: '#CCCCCC' }}>Your Balance</p>
                                <p className="text-xl font-bold" style={{ color: '#0A0A0A' }}>31 Units</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: '#CCCCCC' }}>Ownership</p>
                                <p className="text-xl font-bold" style={{ color: '#0A0A0A' }}>3.100%</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: '#CCCCCC' }}>Value</p>
                                <p className="text-xl font-bold" style={{ color: '#0A0A0A' }}>$3,100.00</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button 
                                className="flex-1 transition-all duration-200"
                                style={{
                                    background: '#0000F5',
                                    color: '#FFFFFF',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    padding: '12px 24px',
                                    borderRadius: '18px',
                                    border: 'none',
                                    height: '48px',
                                    boxShadow: 'rgba(104, 155, 251, 0.3) 0px 12px 40px 0px',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#0000D9';
                                    e.currentTarget.style.boxShadow = 'rgba(104, 155, 251, 0.5) 0px 16px 48px 0px';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = '#0000F5';
                                    e.currentTarget.style.boxShadow = 'rgba(104, 155, 251, 0.3) 0px 12px 40px 0px';
                                }}
                            >
                                Purchase More
                            </button>
                            <button 
                                className="transition-all duration-200"
                                style={{
                                    background: 'rgba(0, 0, 0, 0)',
                                    color: '#0A0A0A',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    padding: '12px 24px',
                                    borderRadius: '18px',
                                    border: '1px solid #E5E5E5',
                                    height: '48px',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#F8FAFC';
                                    e.currentTarget.style.borderColor = '#CCCCCC';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0)';
                                    e.currentTarget.style.borderColor = '#E5E5E5';
                                }}
                            >
                                View Details
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div 
                        style={{
                            background: '#FFFFFF',
                            padding: '24px',
                            borderRadius: '16px',
                            border: '1px solid #E5E5E5',
                            boxShadow: 'rgba(15, 23, 42, 0.11) 0px 14px 40px 0px'
                        }}
                    >
                        <h4 className="text-base font-semibold mb-4" style={{ color: '#0A0A0A' }}>Quick Actions</h4>
                        <div className="space-y-2">
                            {[
                                { icon: Send, label: 'Send', color: '#0000F5' },
                                { icon: Download, label: 'Receive', color: '#689BFB' },
                                { icon: CreditCard, label: 'Buy', color: '#0000F5' },
                                { icon: Activity, label: 'Swap', color: '#689BFB' },
                            ].map((action, idx) => (
                                <button
                                    key={idx}
                                    className="w-full flex items-center gap-3 transition-all duration-200"
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 0, 0, 0)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 245, 0.05)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0)';
                                    }}
                                >
                                    <div 
                                        className="flex items-center justify-center"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: `rgba(0, 0, 245, 0.1)`
                                        }}
                                    >
                                        <action.icon size={20} style={{ color: action.color }} />
                                    </div>
                                    <span className="flex-1 text-sm font-medium" style={{ color: '#0A0A0A' }}>
                                        {action.label}
                                    </span>
                                    <ChevronRight size={16} style={{ color: '#CCCCCC' }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div 
                        className="lg:col-span-2"
                        style={{
                            background: '#FFFFFF',
                            padding: '24px',
                            borderRadius: '16px',
                            border: '1px solid #E5E5E5',
                            boxShadow: 'rgba(15, 23, 42, 0.11) 0px 14px 40px 0px'
                        }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-base font-semibold" style={{ color: '#0A0A0A' }}>Recent Activity</h4>
                            <button className="text-sm font-medium" style={{ color: '#0000F5' }}>View All</button>
                        </div>
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div 
                                    key={tx.id}
                                    className="flex items-center gap-4 p-3 rounded-lg transition-all duration-200 cursor-pointer"
                                    style={{ background: 'rgba(0, 0, 0, 0)' }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = '#F8FAFC';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0)';
                                    }}
                                >
                                    <div 
                                        className="flex items-center justify-center"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: 'rgba(0, 0, 245, 0.1)'
                                        }}
                                    >
                                        <tx.icon size={18} style={{ color: '#0000F5' }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium" style={{ color: '#0A0A0A' }}>{tx.type}</p>
                                        <p className="text-xs" style={{ color: '#CCCCCC' }}>{tx.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{tx.amount}</p>
                                        <span 
                                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{
                                                background: tx.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 245, 0.1)',
                                                color: tx.status === 'completed' ? '#22C55E' : '#0000F5'
                                            }}
                                        >
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-6">
                        {/* Security Status */}
                        <div 
                            style={{
                                background: '#FFFFFF',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #E5E5E5',
                                boxShadow: 'rgba(15, 23, 42, 0.11) 0px 14px 40px 0px'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <Shield size={20} style={{ color: '#22C55E' }} />
                                <h5 className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>Security</h5>
                            </div>
                            <p className="text-xs mb-3" style={{ color: '#CCCCCC', lineHeight: '18px' }}>
                                Your account is protected with multi-factor authentication
                            </p>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} style={{ color: '#22C55E' }} />
                                <span className="text-xs font-medium" style={{ color: '#22C55E' }}>All systems secure</span>
                            </div>
                        </div>

                        {/* Next Dividend */}
                        <div 
                            style={{
                                background: 'linear-gradient(135deg, #689BFB 0%, #0000F5 100%)',
                                padding: '20px',
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: 'rgba(104, 155, 251, 0.3) 0px 16px 40px 0px',
                                color: '#FFFFFF'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <Clock size={20} />
                                <h5 className="text-sm font-semibold">Next Dividend</h5>
                            </div>
                            <p className="text-2xl font-bold mb-1">$45.50</p>
                            <p className="text-xs opacity-80">Expected in 3 days</p>
                        </div>
                    </div>

                </div>

            </main>

        </div>
    );
}
