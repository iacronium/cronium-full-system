# Cronium — Real-World Asset Tokenization Platform

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![Base Sepolia](https://img.shields.io/badge/Network-Base_Sepolia-0052FF?logo=coinbase)
![Ethereum Sepolia](https://img.shields.io/badge/CCIP-Ethereum_Sepolia-627EEA?logo=ethereum)
![Chainlink](https://img.shields.io/badge/Chainlink-CCIP_%26_Automation-375BD2?logo=chainlink)
![License](https://img.shields.io/badge/License-MIT-8ECD63)

Cronium is a platform for the tokenization of real-world assets (RWA), specifically franchises. Fractional ownership of physical businesses is represented as ERC-1155 tokens on Base Sepolia, with automated dividend distribution via Chainlink Automation and cross-chain investment capability via Chainlink CCIP.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [CCIP Cross-Chain Flow](#ccip-cross-chain-flow)
- [Frontend](#frontend)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
Ethereum Sepolia                    Base Sepolia
─────────────────                   ──────────────────────────────────────
CCIPTokenPurchaseSender  ──CCIP──►  CCIPTokenPurchaseReceiver
  (pays LINK fees)                    │
  (holds user USDC)                   ▼
                                    ComplianceManager
                                      │  (KYC check + purchaseTokensFor)
                                      ▼
                                    FranchiseTokenizer (ERC-1155)
                                      │  (mints tokens to buyer)
                                      ▼
                                    DividendDistributor
                                      (Chainlink Automation → cycles → claim)
```

---

## Tech Stack

### Smart Contracts
| Tool | Version | Purpose |
|------|---------|---------|
| Solidity | 0.8.20 | Contract language |
| Hardhat | latest | Development, testing, deployment |
| OpenZeppelin | v5 | ERC-1155, AccessControl, ReentrancyGuard, SafeERC20 |
| Chainlink CCIP | latest | Cross-chain token purchase |
| Chainlink Automation | latest | Automated dividend cycles |

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 16.1 (App Router) | React framework with SSR |
| TypeScript | 5.x | Type safety |
| Wagmi | v2 | Ethereum hooks |
| Viem | v2 | Ethereum utilities |
| RainbowKit | v2 | Wallet connection UI |
| TanStack Query | v5 | Async state management |
| Tailwind CSS | v4 | Utility-first styling |
| Recharts | latest | Charts (performance panel) |
| Lucide React | latest | Icon system |
| Vitest | latest | Frontend unit tests |

---

## Smart Contracts

### Deployed on Base Sepolia (chainId: 84532)

| Contract | Address | Description |
|----------|---------|-------------|
| `FranchiseTokenizer` | `0x8fB7B32E5eDdd84d1De275Ba09d3370E9F9501E6` | ERC-1155 fractional ownership tokens |
| `ComplianceManager` | `0x847d712f498D7DFaddccF226c70649375A1B6B3a` | KYC gating + primary token sales |
| `DividendDistributor` | `0xdBaD664757a6982750239Df3c6aE9f5422D87938` | Chainlink Automation dividend cycles |
| `MockERC20 (mUSDC)` | `0x3D90773420BCB1F867216f1c7D3e080d70857654` | Testnet payment token (18 decimals) |
| `CCIPTokenPurchaseReceiver` | `0xCf1133b557353ae53fCE04067F61502518d8f423` | Receives cross-chain purchase messages |

### Deployed on Ethereum Sepolia (chainId: 11155111)

| Contract | Address | Description |
|----------|---------|-------------|
| `MockERC20 (mUSDC-ETH)` | `0x5d22C60eFCb70cA752E718187D7C7C1D2a045410` | Testnet payment token on source chain |
| `CCIPTokenPurchaseSender` | `0x53B463Da4dB9E5c1797C17e50f37a64b52dda2dd` | Sends cross-chain purchase requests |

### Contract Details

#### FranchiseTokenizer
- ERC-1155 multi-token standard
- `MINTER_ROLE` held by `ComplianceManager`
- `MANAGER_ROLE` for creating franchises
- `_update` hook settles dividends before any transfer and enforces KYC on receivers
- `totalSupply(franchiseId)` returns current minted supply

#### ComplianceManager
- KYC states: `None(0)`, `Pending(1)`, `Verified(2)`, `Rejected(3)`
- `demoModeActive` flag bypasses KYC for testnet testing
- `purchaseTokens(franchiseId, tokenAmount, expectedPaymentAmount)` — direct purchase
- `purchaseTokensFor(buyer, franchiseId, tokenAmount, expectedPaymentAmount)` — CCIP purchase (requires `CCIP_RECEIVER_ROLE`)
- Price formula: `requiredPayment = (totalValue × tokenAmount) / maxSupply`
- `totalValue` stored with **6 decimals** (e.g. `100_000e6` = $100,000)
- Payment token uses **18 decimals** → frontend scales: `priceIn6 × 10^12`
- Cumulative payout-per-token pattern (Synthetix-style)
- `depositDividends(franchiseId, amount)` → adds to pending pool
- `checkUpkeep` / `performUpkeep` — Chainlink Automation entry points
- `claimDividend(franchiseId)` — settles and transfers accrued dividends
- `updateAccount(franchiseId, account)` — called by FranchiseTokenizer before transfers
- Cycle interval: **1 hour** (3600 seconds)

#### CCIPTokenPurchaseReceiver (Base Sepolia)
- Extends `CCIPReceiver` from Chainlink
- Allowlist: `allowedSenders[chainSelector][senderAddress]`
- Replay protection via `processedMessages[messageId]`
- Uses try/catch to avoid blocking the CCIP router on failures
- Liquidity: **100,000 mUSDC** deposited (covers ~1,000 purchases of 100 tokens at $100/token)
- `availableLiquidity()` returns current USDC balance
- To replenish: `npx hardhat run scripts/deposit_usdc_receiver.js --network baseSepolia`

#### CCIPTokenPurchaseSender (Ethereum Sepolia)
- Deployed at `0xaeB7dF9dD6268d38f6e30286A6D0885b85737f9F` — verified on Etherscan
- Pays CCIP fees in LINK (held by the contract, not the user)
- **LINK balance: 2 LINK deposited** (~45 messages at ~0.044 LINK/msg)
- Authorized in Receiver allowlist: `allowedSenders[16015286601757825753][0xaeB7...] = true`
- `sendPurchaseRequest(franchiseId, tokenAmount, paymentAmount)` — main entry point
- `estimateFee(franchiseId, tokenAmount, paymentAmount)` — view, returns LINK wei
- `depositLinkFees(amount)` — owner tops up LINK balance
- **Destination gas limit: 500,000** (updated from 300,000 — confirmed working end-to-end)
- To replenish LINK: `npx hardhat run scripts/deposit_link.js --network ethereumSepolia`

---

## CCIP Cross-Chain Flow

```
1. User on Ethereum Sepolia approves mUSDC-ETH to CCIPTokenPurchaseSender
2. User calls sendPurchaseRequest(franchiseId, tokenAmount, paymentAmount)
3. Sender pulls USDC from user, builds EVM2AnyMessage, pays LINK fee
4. Chainlink CCIP relays message to Base Sepolia
5. CCIPTokenPurchaseReceiver._ccipReceive() is called
6. Receiver verifies sender allowlist + replay protection
7. Receiver calls complianceManager.purchaseTokensFor(buyer, ...)
8. ComplianceManager checks KYC (bypassed in demo mode)
9. ComplianceManager transfers USDC from Receiver to treasury
10. FranchiseTokenizer mints ERC-1155 tokens directly to buyer on Base Sepolia
```

### CCIP Configuration
| Parameter | Value |
|-----------|-------|
| Base Sepolia Router | `0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93` |
| Ethereum Sepolia Router | `0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59` |
| Base Sepolia Chain Selector | `10344971235874465080` |
| Ethereum Sepolia Chain Selector | `16015286601757825753` |
| LINK on Ethereum Sepolia | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |

---

## Frontend

### Structure
```
frontend/
├── app/
│   ├── AccountAbstractionDemo.tsx   # Main dashboard (home section)
│   ├── components/
│   │   ├── Sidebar.tsx              # 240px fixed sidebar — Linear style
│   │   ├── TopNav.tsx               # 56px top bar with search + wallet
│   │   ├── WalletButton.tsx         # Custom RainbowKit connect button (CCIP-aware)
│   │   ├── WalletBalance.tsx        # ETH balance via Axios + Zod
│   │   ├── ExploreSection.tsx       # Asset exploration + KYC status
│   │   ├── PortfolioSection.tsx     # Portfolio dashboard
│   │   └── SectionView.tsx          # Section router
│   ├── config/
│   │   ├── contracts.ts             # Contract addresses + ABIs (Base + Eth Sepolia)
│   │   └── api.ts                   # Axios RPC client with 429 retry
│   ├── hooks/
│   │   ├── useBlockchain.ts         # TanStack Query hooks (balance, block, gas)
│   │   ├── useTransactionFeed.ts    # Live transaction feed
│   │   ├── useTransactionHandler.ts # Write contract abstraction
│   │   └── useCcipPurchase.ts       # Cross-chain purchase flow (Eth Sepolia → Base)
│   ├── services/
│   │   └── blockchainServices.ts    # JSON-RPC services with Zod validation
│   └── context/
│       └── NavigationContext.tsx    # Section navigation state
├── public/
│   └── franchises/
│       └── 1/                       # Franchise #1 images
│           ├── photo-1.webp         # Exterior
│           ├── photo-2.webp         # Interior
│           ├── photo-3.webp         # Product
│           └── photo-4.webp         # Operations
└── __tests__/
    ├── bugConditions.test.tsx       # Regression tests (intentionally failing)
    └── preservation.test.tsx        # Preservation property tests
```

### Key Frontend Features

#### AccountAbstractionDemo (Home)
- **Portfolio Value** — calculated from on-chain: `tokens × (totalValue / maxSupply / 1e6)`
- **Holdings** — live ERC-1155 balance
- **Rewards Module** — claimable dividends + bar chart of cycle history
- **Franchise Card** — photo gallery (4 images per franchise, webp format)
  - Green gradient overlay on images for brand consistency
  - Thumbnail strip with active state
  - Token supply progress bar with glow effect
  - 4 stat boxes: Current Supply, Raised (USDC), ROI, Price/Token
  - Custom quantity stepper (Minus/Plus icons, no native browser arrows)
  - **`Buy Tokens`** — direct purchase on Base Sepolia
  - **`Buy via CCIP Bridge`** — cross-chain purchase from Ethereum Sepolia
- **My Portfolio** — live asset list
- **Performance** — line chart
- **Recent Transactions** — live feed from on-chain events

#### Multi-Chain Wallet Support
The app supports two chains simultaneously via RainbowKit + wagmi:

| Chain | Mode | Behavior |
|-------|------|----------|
| Base Sepolia | Native | Direct purchase via `ComplianceManager` |
| Ethereum Sepolia | CCIP | Purchase bridged via `CCIPTokenPurchaseSender` |
| Any other | Unsupported | "Wrong Network" banner with switch prompt |

When on Ethereum Sepolia, `WalletButton` shows **"CCIP Mode ⚡"** instead of "Wrong Network". The purchase button changes to **"Buy via CCIP Bridge"** and a banner explains the ~20 min relay time. The explorer link switches from BaseScan to Etherscan automatically.

Supported wallets (in order): **Coinbase Wallet** (recommended — native Base), **MetaMask**, **WalletConnect**.

#### Franchise Image System (Option A — Static Map)
Images are mapped by `franchiseId` in `AccountAbstractionDemo.tsx`:
```typescript
const FRANCHISE_IMAGES: Record<number, string[]> = {
    1: [
        '/franchises/1/photo-1.webp',
        '/franchises/1/photo-2.webp',
        '/franchises/1/photo-3.webp',
        '/franchises/1/photo-4.webp',
    ],
};
```
To add a new franchise: create `/public/franchises/{id}/photo-{1-4}.webp` and add the entry.

#### ABI Notes
- `claimDividend(uint256 franchiseId)` — **1 parameter only** (no cycleId)
- `getPendingDividend(address user, uint256 franchiseId)` — **2 parameters** (no cycleId)
- `totalValue` in `FranchiseTokenizer` uses **6 decimals**
- Payment token `mUSDC` uses **18 decimals**
- Price conversion: `pricePerToken = (totalValue / maxSupply) × 10^12` to get 18-decimal amount

---

## Design System

Linear-inspired dark design system. Full spec in `.kiro/steering/design-system.md`.

| Token | Value | Usage |
|-------|-------|-------|
| `color-brand` | `#8ECD63` | Primary actions, active states, CTAs |
| `color-bg` | `#171723` | App background |
| `color-surface` | `#293530` | Cards, panels |
| `color-text` | `#FFFFFF` | Primary text |
| `color-muted` | `#8A8F98` | Secondary text, labels |
| `color-canceled` | `#4E4E56` | Disabled, milestone markers |

- **Typography**: Inter, 14px body, 24px headings, monospace for numbers
- **Border radius**: 4px badges, 6px buttons/cards, 8px modals
- **Animations**: max 150ms ease-out
- **Sidebar**: 240px, `#1C1C28`
- **TopNav**: 56px, `#171723`

---

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask with Base Sepolia network
- ETH on Base Sepolia (faucet: [faucets.chain.link](https://faucets.chain.link))

### Smart Contracts
```bash
# Install dependencies
npm install

# Run all tests (38 tests — 24 core + 14 CCIP)
npx hardhat test

# Compile
npx hardhat compile

# Deploy MVP to Base Sepolia
npx hardhat run scripts/deploy_mvp.js --network baseSepolia

# Deploy CCIP Receiver to Base Sepolia
npx hardhat run scripts/deploy_ccip.js --network baseSepolia

# Deploy CCIP Sender to Ethereum Sepolia
npx hardhat run scripts/deploy_ccip.js --network ethereumSepolia

# Verify contracts (Etherscan API v2 — same key for Base + Ethereum)
npx hardhat verify --network baseSepolia <ADDRESS> <CONSTRUCTOR_ARGS>
npx hardhat verify --network ethereumSepolia <ADDRESS> <CONSTRUCTOR_ARGS>
```

### Getting Started — CCIP Sender Maintenance
```bash
# Deposit more LINK when the Sender runs low (check balance first — script shows it)
npx hardhat run scripts/deposit_link.js --network ethereumSepolia

# Deposit more mUSDC liquidity in the Receiver when it runs low
npx hardhat run scripts/deposit_usdc_receiver.js --network baseSepolia

# Authorize a new Sender address in the Receiver (if redeployed)
npx hardhat run scripts/authorize_sender.js --network baseSepolia
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npx vitest run     # Run frontend tests
```

### Netlify Deployment

The frontend is configured for Netlify via `frontend/netlify.toml`. Before deploying:

1. Connect the repo to Netlify and set **Base directory** to `frontend`.
2. Add all `NEXT_PUBLIC_*` variables in **Site settings → Environment variables**:

```
NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS=0x8fB7B32E5eDdd84d1De275Ba09d3370E9F9501E6
NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS=0x847d712f498D7DFaddccF226c70649375A1B6B3a
NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS=0xdBaD664757a6982750239Df3c6aE9f5422D87938
NEXT_PUBLIC_MUSDC_ADDRESS=0x3D90773420BCB1F867216f1c7D3e080d70857654
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_BASE_KEY>
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_ETH_KEY>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<YOUR_WALLETCONNECT_PROJECT_ID>
NEXT_PUBLIC_CCIP_SENDER_ADDRESS=0x53B463Da4dB9E5c1797C17e50f37a64b52dda2dd
NEXT_PUBLIC_ETH_SEPOLIA_USDC_ADDRESS=0x5d22C60eFCb70cA752E718187D7C7C1D2a045410
NEXT_PUBLIC_ETH_SEPOLIA_LINK_ADDRESS=0x779877A7B0D9E8603169DdbD7836e478b4624789
```

3. Trigger a deploy — Netlify will run `npm run build` and publish `.next`.

### ⚡ RPC Optimization & Rate Limiting

**Important:** Infura and other RPC providers have daily credit limits. To avoid hitting rate limits:

#### ⚠️ Error 402 (Payment Required)
If you see **Error 402** in the Network tab, you've hit Infura's daily limit (100k requests/day).

**Quick Fix:**
1. **Switch to Alchemy** (300M compute units/month free) — See [ALCHEMY_SETUP.md](./ALCHEMY_SETUP.md)
2. **Or wait until 00:00 UTC** for Infura credits to reset
3. **Temporary**: Use public endpoints (already configured):
   ```bash
   NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
   NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ```

#### Current Optimizations Implemented:
- ✅ **Polling interval increased to 30s** (from default 4s)
- ✅ **Request batching enabled** (multiple calls in one request)
- ✅ **Query caching: 2 minutes** (staleTime)
- ✅ **No automatic refetch** on mount/focus/reconnect
- ✅ **Manual refresh button** for user-triggered updates
- ✅ **WebSocket events** for transaction feed (no polling)

#### Best Practices:
1. **Use the manual Refresh button** instead of relying on auto-updates
2. **Cache data locally** — franchise info rarely changes
3. **Monitor your Infura dashboard** at https://app.infura.io
4. **Set up email alerts** at 75%, 85%, 100% usage
5. **Consider upgrading** if you consistently hit limits

#### If You Hit Rate Limits:
- **Error 402**: Daily credit limit reached — wait until 00:00 UTC or upgrade
- **Error 429**: Too many requests per second — reduce concurrent users or upgrade
- **Credits reset daily** at 00:00 UTC

#### Alternative RPC Providers:
- [Alchemy](https://www.alchemy.com/) — 300M compute units/month free
- [QuickNode](https://www.quicknode.com/) — 50M credits/month free
- [Ankr](https://www.ankr.com/) — Public endpoints (rate limited)

To switch providers, update `NEXT_PUBLIC_RPC_URL` and `NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL` in `frontend/.env.local`.

---

## Testing

### Smart Contract Tests (Hardhat + Chai)
```
38 passing

CCIP Cross-Chain Purchase — Cronium MVP
  CCIP-01: Flujo feliz end-to-end
    ✓ Debería ejecutar una compra cross-chain completa y mintear tokens al buyer
  Sender: Validaciones de entrada
    ✓ CCIP-02: Revierte si no hay LINK suficiente para fees
    ✓ CCIP-03: Revierte si franchiseId es 0
    ✓ CCIP-04: Revierte si tokenAmount es 0
    ✓ CCIP-05: Revierte si paymentAmount es 0
  Receiver: Seguridad y manejo de errores
    ✓ CCIP-06: Revierte si el sender no está en la allowlist
    ✓ CCIP-07: Revierte si el mismo messageId se procesa dos veces (replay attack)
    ✓ CCIP-08: Falla silenciosamente si no hay liquidez USDC (no revierte el mensaje CCIP)
    ✓ CCIP-09: Falla silenciosamente si el buyer no tiene KYC (modo producción)
  Admin: Control de acceso
    ✓ CCIP-10: Solo el owner puede autorizar/desautorizar senders en el Receiver
    ✓ CCIP-11: Solo el owner puede depositar y retirar liquidez del Receiver
    ✓ CCIP-12: Solo el owner puede actualizar el receiver en el Sender
  CCIP-13: estimateFee
    ✓ Debería retornar el fee correcto del mock router
  CCIP-14: Flujo completo con demo mode activo (sin KYC)
    ✓ Debería completar la compra cross-chain sin KYC cuando demo mode está activo

Cronium Extended System Verification
  ComplianceManager: Búsqueda de Límites y Demo Mode
    ✓ Debería permitir Batch KYC hasta 100 usuarios
    ✓ Debería habilitar Demo Mode y saltarse KYC
  DividendDistributor: Múltiples Ciclos y Rounding
    ✓ Debería manejar múltiples ciclos y que los inversores cobren ambos
    ✓ Debería verificar el comportamiento con divisiones no exactas (Rounding Dust)

FranchiseTokenizer
  Creación de Franquicias
    ✓ Debería crear una franquicia correctamente con datos válidos
    ✓ Debería revertir la creación si el llamante no tiene el MANAGER_ROLE
    ✓ Debería revertir la creación de una franquicia si maxSupply es 0
  Acuñación de Tokens
    ✓ Debería acuñar tokens si el llamante tiene MINTER_ROLE y no se excede el maxSupply
    ✓ Debería revertir la acuñación si el llamante no tiene el MINTER_ROLE
    ✓ Debería revertir mintTokens si se intenta acuñar más allá del maxSupply

Cronium Full System Integration Test
  Investment and KYC Workflow
    ✓ Debería REVERTIR la compra si el usuario no tiene KYC
    ✓ Debería PERMITIR la compra después de la verificación KYC
  Dividend Distribution Workflow
    ✓ Debería distribuir y permitir reclamar dividendos correctamente

Mining Equipment Security & Dividends
  Transfer Security (KYC Restrictions)
    ✓ Debería bloquear transferencias a direcciones sin KYC
    ✓ Debería permitir transferencias entre direcciones con KYC
  Dividend Calculations (Manual Trigger & 6 Decimals)
    ✓ Debería distribuir dividendos exactos usando performUpkeep
    ✓ Debería fallar si se llama performUpkeep sin fondos pendientes

QA Audit Test Suite - Cronium NFT Marketplace
  Security & Permissions
    ✓ SEC-01: Solo el MANAGER_ROLE debe crear franquicias
    ✓ SEC-02: Solo el KYC_ADMIN_ROLE debe asignar estados KYC
    ✓ SEC-03: Solo el DEFAULT_ADMIN_ROLE debe asignar nuevos roles
  Edge Cases: Investment Flow
    ✓ EDGE-01: Debe fallar si el allowance de mUSDC es insuficiente
    ✓ EDGE-02: Debe fallar si el saldo de mUSDC es insuficiente
    ✓ EDGE-03: Debe fallar si se excede el maxSupply de la franquicia
  Metadata Verification
    ✓ MT-01: La URI del contrato debe coincidir con IPFS
```

### Frontend Tests (Vitest)
Tests in `frontend/app/__tests__/` contain unit and integration tests for `AccountAbstractionDemo.tsx` (covering network guards, premature isInvesting resets, race conditions in demo setups, UserRejectedRequestError detection, and property preservation). All 14 tests pass successfully.

---

## Environment Variables

### Root `.env`
```env
YOUR_PRIVATE_KEY=""          # Deployer wallet private key (no 0x prefix)
YOUR_INFURA_KEY=""           # Infura project key (covers Base + Ethereum Sepolia)
YOUR_BASESCAN_API_KEY=""     # Leave empty — BaseScan now uses Etherscan API v2
YOUR_ETHERSCAN_API_KEY=""    # Etherscan API v2 key (covers Base + Ethereum)

# CCIP — filled after each deployment step
COMPLIANCE_MANAGER_ADDRESS="0x847d712f498D7DFaddccF226c70649375A1B6B3a"
PAYMENT_TOKEN_ADDRESS="0x3D90773420BCB1F867216f1c7D3e080d70857654"
CCIP_RECEIVER_ADDRESS="0xCf1133b557353ae53fCE04067F61502518d8f423"
PAYMENT_TOKEN_ADDRESS_ETH_SEPOLIA="0x5d22C60eFCb70cA752E718187D7C7C1D2a045410"
CCIP_SENDER_ADDRESS="0xaeB7dF9dD6268d38f6e30286A6D0885b85737f9F"
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS=0x8fB7B32E5eDdd84d1De275Ba09d3370E9F9501E6
NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS=0x847d712f498D7DFaddccF226c70649375A1B6B3a
NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS=0xdBaD664757a6982750239Df3c6aE9f5422D87938
NEXT_PUBLIC_MUSDC_ADDRESS=0x3D90773420BCB1F867216f1c7D3e080d70857654
NEXT_PUBLIC_RPC_URL=https://base-sepolia.infura.io/v3/<YOUR_INFURA_KEY>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # Optional — get at cloud.walletconnect.com

# CCIP Cross-Chain (Ethereum Sepolia)
NEXT_PUBLIC_CCIP_SENDER_ADDRESS=0xaeB7dF9dD6268d38f6e30286A6D0885b85737f9F
NEXT_PUBLIC_ETH_SEPOLIA_USDC_ADDRESS=0x5d22C60eFCb70cA752E718187D7C7C1D2a045410
NEXT_PUBLIC_ETH_SEPOLIA_LINK_ADDRESS=0x779877A7B0D9E8603169DdbD7836e478b4624789
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=        # Optional — falls back to public Sepolia node
```

---

## Deployment Checklist

See `DEPLOYMENT_CHECKLIST.md` for the full production checklist.

### Current Status (Base Sepolia Testnet)
- [x] MVP contracts deployed and verified
- [x] CCIP Receiver deployed and verified (Base Sepolia — `0xCf1133b557353ae53fCE04067F61502518d8f423`)
- [x] CCIP Sender deployed and verified (Ethereum Sepolia — `0x53B463Da4dB9E5c1797C17e50f37a64b52dda2dd`)
- [x] Sender authorized in Receiver allowlist (`allowedSenders[16015286601757825753][0x53B4...] = true`)
- [x] **2 LINK deposited** in Sender (~45 messages at ~0.044 LINK/msg)
- [x] Destination gas limit set to **500,000** (tested and confirmed end-to-end ✅)
- [x] Franchise #1 "Cronium Burger #1" created ($100,000 total value, 1,000 max supply)
- [x] Demo mode active
- [x] Frontend connected to live contracts (Base Sepolia + Ethereum Sepolia)
- [x] Multi-chain wallet support: Coinbase Wallet, MetaMask, WalletConnect
- [x] CCIP Mode UI — "Buy via CCIP Bridge" button on Ethereum Sepolia
- [x] All 45 smart contract tests passing
- [x] WalletConnect Project ID configured
- [x] USDC liquidity deposited in Receiver for cross-chain purchases (100,000 mUSDC)
- [x] Production key rotation completed
- [x] `FranchiseTokenizer.setComplianceManager()` called post-deploy ✅
- [x] `FranchiseTokenizer.setDividendDistributor()` called post-deploy ✅

### To Test the Full Flow
1. Connect MetaMask to **Base Sepolia**
2. Click the **ShieldAlert** icon (demo setup) — mints 1,000 mUSDC and sets KYC
3. Set quantity and click **Approve mUSDC** — approve the ComplianceManager
4. Click **Buy Tokens** — purchase ERC-1155 franchise tokens
5. Check **My Portfolio** section to see your holdings

### To Test CCIP Flow
1. Switch MetaMask to **Ethereum Sepolia**
2. Ensure wallet has mUSDC-ETH (`0x5d22C60e...`) and ETH for gas
3. Click **"Buy via CCIP Bridge"** in the purchase panel — the app handles approvals automatically
4. Sign the USDC approval tx, then sign the `sendPurchaseRequest` tx
5. Wait ~20 min for Chainlink CCIP to relay the message to Base Sepolia
6. Switch back to Base Sepolia — tokens appear in your wallet
7. Track the message at [ccip.chain.link](https://ccip.chain.link) using the tx hash

> **LINK fees** are paid by the Sender contract (pre-funded with 2 LINK, ~45 messages at ~0.044 LINK each).
> To replenish: `npx hardhat run scripts/deposit_link.js --network ethereumSepolia`

---

## Basescan Links

| Contract | Link |
|----------|------|
| FranchiseTokenizer | [View](https://sepolia.basescan.org/address/0x8fB7B32E5eDdd84d1De275Ba09d3370E9F9501E6#code) |
| ComplianceManager | [View](https://sepolia.basescan.org/address/0x847d712f498D7DFaddccF226c70649375A1B6B3a#code) |
| DividendDistributor | [View](https://sepolia.basescan.org/address/0xdBaD664757a6982750239Df3c6aE9f5422D87938#code) |
| MockERC20 (mUSDC) | [View](https://sepolia.basescan.org/address/0x3D90773420BCB1F867216f1c7D3e080d70857654#code) |
| CCIPTokenPurchaseReceiver | [View](https://sepolia.basescan.org/address/0xCf1133b557353ae53fCE04067F61502518d8f423#code) |
| CCIPTokenPurchaseSender (Etherscan) | [View](https://sepolia.etherscan.io/address/0x53B463Da4dB9E5c1797C17e50f37a64b52dda2dd#code) |

---

*Last updated: June 2026 — Cronium Team · CCIPTokenPurchaseSender deployed `0xaeB7dF9dD6268d38f6e30286A6D0885b85737f9F` · 2 LINK funded · Sender authorized on Receiver · Gas limit 500k · E2E test passed ✅ · All 38 smart contract and 14 frontend tests passing ✅*
