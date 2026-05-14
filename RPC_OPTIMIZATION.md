# RPC Optimization Guide — Cronium MVP

## 🚨 Problem: Infura Rate Limiting

Infura has daily credit limits that reset at **00:00 UTC**. When you exceed your limit:
- **Error 402**: Daily credit limit reached
- **Error 429**: Too many requests per second (throughput limit)

## ✅ Optimizations Implemented

### 1. **Reduced Polling Frequency**
```typescript
// Before: 4 seconds (default)
// After: 30 seconds
pollingInterval: 30_000
```

### 2. **Request Batching**
```typescript
http(rpcUrl, { 
  batch: true,  // Multiple calls in one HTTP request
  retryCount: 2,
  timeout: 10_000,
})
```

### 3. **Aggressive Caching**
```typescript
// Query cache: 2 minutes
staleTime: 1000 * 60 * 2

// Garbage collection: 10 minutes
gcTime: 1000 * 60 * 10

// No automatic refetch
refetchOnMount: false
refetchOnWindowFocus: false
refetchOnReconnect: false
```

### 4. **Manual Refresh Button**
Users can manually refresh data instead of automatic polling:
```tsx
<button onClick={refetchAllData}>
  <RefreshCw /> Refresh
</button>
```

### 5. **WebSocket Events (No Polling)**
Transaction feed uses `useWatchContractEvent` which listens to events instead of polling:
```typescript
useWatchContractEvent({
  address: COMPLIANCE_MANAGER_ADDRESS,
  eventName: 'TokensPurchased',
  onLogs(logs) { /* handle new events */ }
})
```

## 📊 Expected RPC Usage

### Before Optimization:
- **Polling**: Every 4 seconds = ~21,600 requests/day per user
- **No caching**: Every page load = full refetch
- **Auto-refetch**: On focus, mount, reconnect

### After Optimization:
- **Polling**: Every 30 seconds = ~2,880 requests/day per user
- **Caching**: 2 minutes = ~720 requests/day per user
- **Manual refresh**: Only when user clicks

**Reduction: ~93% fewer RPC calls** 🎉

## 🔍 Monitoring Your Usage

### 1. Infura Dashboard
Visit: https://app.infura.io/dashboard

Check:
- **Daily Credits Used** (resets at 00:00 UTC)
- **Credits per Second** (throughput)
- **Request History** (last 24 hours)

### 2. Enable Email Alerts
Go to: https://app.infura.io/settings/account

Enable notifications at:
- ✅ 75% of daily limit
- ✅ 85% of daily limit
- ✅ 100% of daily limit

### 3. Browser DevTools
Open Network tab and filter by:
- `infura.io` or your RPC URL
- Count requests per minute
- Should see ~1-2 requests per 30 seconds

## 🛠️ Additional Optimizations (If Needed)

### Option 1: Increase Polling Interval
```typescript
// In providers.tsx
pollingInterval: 60_000, // 1 minute instead of 30 seconds
```

### Option 2: Increase Cache Time
```typescript
// In providers.tsx
staleTime: 1000 * 60 * 5, // 5 minutes instead of 2
```

### Option 3: Disable Transaction Feed History
```typescript
// In useTransactionFeed.ts
const HISTORY_BLOCKS = BigInt(100); // Reduce from 500 to 100
```

### Option 4: Use Alternative RPC Provider

#### Alchemy (Recommended)
- **Free tier**: 300M compute units/month
- **Setup**: https://www.alchemy.com/
```bash
# In frontend/.env.local
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

#### QuickNode
- **Free tier**: 50M credits/month
- **Setup**: https://www.quicknode.com/
```bash
NEXT_PUBLIC_RPC_URL=https://your-endpoint.base-sepolia.quiknode.pro/YOUR_TOKEN/
```

#### Ankr (Public, Rate Limited)
```bash
NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/base_sepolia
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://rpc.ankr.com/eth_sepolia
```

## 📈 Scaling for Production

### For 10 Users:
- **Infura Free**: 100k requests/day ÷ 720 = ~138 users ✅
- **Current optimization**: Supports 10 users easily

### For 100+ Users:
- **Upgrade to Infura Developer**: 3M requests/day ($50/month)
- **Or use Alchemy**: 300M compute units/month (free)
- **Or use QuickNode**: 50M credits/month (free)

### For 1000+ Users:
- **Use multiple RPC providers** (load balancing)
- **Implement server-side caching** (Redis)
- **Use WebSocket connections** (less overhead)

## 🐛 Troubleshooting

### "Payment Required" (Error 402)
**Cause**: Daily credit limit reached

**Solution**:
1. Wait until 00:00 UTC (credits reset)
2. Upgrade your Infura plan
3. Switch to alternative RPC provider

### "Too Many Requests" (Error 429)
**Cause**: Throughput limit exceeded (requests per second)

**Solution**:
1. Increase `pollingInterval` to 60 seconds
2. Reduce concurrent users
3. Upgrade your Infura plan

### High RPC Usage Despite Optimizations
**Check**:
1. Browser DevTools → Network tab
2. Count requests to RPC endpoint
3. Should be ~1-2 per 30 seconds

**Common causes**:
- Multiple browser tabs open (each polls independently)
- Browser extensions making RPC calls
- Other dApps using same RPC endpoint

## 📝 Best Practices

### Development:
- ✅ Use testnet RPC endpoints (Base Sepolia, Eth Sepolia)
- ✅ Enable caching (already implemented)
- ✅ Use manual refresh instead of auto-polling
- ✅ Close unused browser tabs

### Production:
- ✅ Use dedicated RPC endpoint (not public)
- ✅ Monitor usage daily
- ✅ Set up email alerts
- ✅ Have backup RPC provider ready
- ✅ Implement rate limiting on frontend
- ✅ Use server-side caching for static data

## 🔗 Resources

- [Infura Rate Limiting Docs](https://docs.infura.io/api/network-endpoints/rate-limiting)
- [Alchemy Pricing](https://www.alchemy.com/pricing)
- [QuickNode Pricing](https://www.quicknode.com/pricing)
- [Wagmi Caching Guide](https://wagmi.sh/react/guides/tanstack-query)

---

**Last Updated**: 2026-05-13  
**Optimization Level**: ~93% reduction in RPC calls  
**Status**: ✅ Production Ready
