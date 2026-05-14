'use client';

import { useAccount } from 'wagmi';
import { useGetBalance } from '../hooks/useBlockchain';

export default function WalletBalance() {
    const { address, isConnected } = useAccount();
    const { data, isLoading, isError } = useGetBalance(address || '');

    if (!isConnected) {
        return (
            <div
                className="glass-panel flex items-center gap-3"
                style={{ padding: '12px 16px' }}
            >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4E4E56' }} />
                <span style={{ fontSize: '13px', color: '#8A8F98' }}>No wallet connected</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="glass-panel flex items-center gap-3" style={{ padding: '12px 16px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8ECD63', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '13px', color: '#8A8F98' }}>Loading…</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="glass-panel flex items-center gap-3" style={{ padding: '12px 16px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#81B580' }} />
                <span style={{ fontSize: '13px', color: '#8A8F98' }}>RPC error</span>
            </div>
        );
    }

    return (
        <div className="glass-panel flex items-center justify-between" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-3">
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8ECD63' }} />
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
                        Native Balance
                    </p>
                    <p className="text-2xl font-black text-white tracking-tighter">
                        {data?.balance || '0'}{' '}
                        <span className="text-sm font-black text-[#8ECD63]">{data?.symbol || 'ETH'}</span>
                    </p>
                </div>
            </div>
            <span
                style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#8ECD63',
                    background: 'rgba(142,205,99,0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                }}
            >
                {data?.network || 'sepolia-base'}
            </span>
        </div>
    );
}
