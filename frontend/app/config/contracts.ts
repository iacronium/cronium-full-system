// app/config/contracts.ts
import { Address } from 'viem';

export const FRANCHISE_TOKENIZER_ADDRESS = (process.env.NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS || '0x4b740015a2d61d9FA38780885b9BEf5596fBF4e7') as Address;
export const COMPLIANCE_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS || '0x1BA3188450e39D13707CEf29EC291543F2674b66') as Address;
export const DIVIDEND_DISTRIBUTOR_ADDRESS = (process.env.NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS || '0x5A8Ef064F9985aC7c1ad19ceC122AAE580Bb02E0') as Address;
export const MUSDC_ADDRESS = (process.env.NEXT_PUBLIC_MUSDC_ADDRESS || '0x5c040e640aea34CC9ef86548dBAAF15749C1E6e4') as Address;

// ─── CCIP Cross-Chain Contracts ───────────────────────────────────────────────
// CCIPTokenPurchaseSender deployed on Ethereum Sepolia (chain 11155111).
// Users on Eth Sepolia interact with this contract; it bridges the purchase
// request to Base Sepolia via Chainlink CCIP.
export const CCIP_SENDER_ADDRESS = (process.env.NEXT_PUBLIC_CCIP_SENDER_ADDRESS || '') as Address;

// USDC address on Ethereum Sepolia (used to approve the Sender contract)
export const ETH_SEPOLIA_USDC_ADDRESS = (process.env.NEXT_PUBLIC_ETH_SEPOLIA_USDC_ADDRESS || '') as Address;

// LINK token address on Ethereum Sepolia (used to pay CCIP fees)
export const ETH_SEPOLIA_LINK_ADDRESS = (process.env.NEXT_PUBLIC_ETH_SEPOLIA_LINK_ADDRESS || '0x779877A7B0D9E8603169DdbD7836e478b4624789') as Address;

export const FRANCHISE_ABI = [
    {
        "inputs": [],
        "name": "nextFranchiseId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "account", "type": "address" },
            { "internalType": "uint256", "name": "id", "type": "uint256" }
        ],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "franchiseId", "type": "uint256" }],
        "name": "getFranchiseInfo",
        "outputs": [
            {
                "components": [
                    { "internalType": "string", "name": "name", "type": "string" },
                    { "internalType": "uint256", "name": "totalValue", "type": "uint256" },
                    { "internalType": "uint256", "name": "maxSupply", "type": "uint256" },
                    { "internalType": "uint256", "name": "currentSupply", "type": "uint256" },
                    { "internalType": "bool", "name": "isActive", "type": "bool" },
                    { "internalType": "address", "name": "realWorldManager", "type": "address" }
                ],
                "internalType": "struct FranchiseTokenizer.Franchise",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const COMPLIANCE_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "kycStatus",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "demoModeActive",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId", "type": "uint256" },
            { "internalType": "uint256", "name": "tokenAmount", "type": "uint256" },
            { "internalType": "uint256", "name": "expectedPaymentAmount", "type": "uint256" }
        ],
        "name": "purchaseTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint8", "name": "status", "type": "uint8" }
        ],
        "name": "setKYCStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // TokensPurchased event — emitted by purchaseTokens()
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "address", "name": "buyer",         "type": "address" },
            { "indexed": true,  "internalType": "uint256", "name": "franchiseId",   "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "tokenAmount",   "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "paymentAmount", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "pricePerToken", "type": "uint256" }
        ],
        "name": "TokensPurchased",
        "type": "event"
    }
] as const;

export const DIVIDEND_ABI = [
    // claimDividend(uint256 franchiseId) — solo un parámetro
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId", "type": "uint256" }
        ],
        "name": "claimDividend",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "pendingDividendPool",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "interval",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // getPendingDividend(address user, uint256 franchiseId) — sin cycleId
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "franchiseId", "type": "uint256" }
        ],
        "name": "getPendingDividend",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "franchiseId", "type": "uint256" }],
        "name": "currentCycleId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId", "type": "uint256" },
            { "internalType": "uint256", "name": "cycleId", "type": "uint256" }
        ],
        "name": "getDividendCycleInfo",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "cycleId", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
                    { "internalType": "uint256", "name": "perTokenPayout", "type": "uint256" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
                ],
                "internalType": "struct DividendDistributor.DividendCycle",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    // DividendClaimed event — emitted by claimDividend()
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "uint256", "name": "franchiseId", "type": "uint256" },
            { "indexed": true,  "internalType": "uint256", "name": "cycleId",     "type": "uint256" },
            { "indexed": true,  "internalType": "address", "name": "user",        "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount",      "type": "uint256" }
        ],
        "name": "DividendClaimed",
        "type": "event"
    }
] as const;

export const MUSDC_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

// ─── CCIP Sender ABI (Ethereum Sepolia) ───────────────────────────────────────
// Minimal ABI — only the functions the frontend needs to call.
export const CCIP_SENDER_ABI = [
    // sendPurchaseRequest(franchiseId, tokenAmount, paymentAmount) → messageId
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId",   "type": "uint256" },
            { "internalType": "uint256", "name": "tokenAmount",   "type": "uint256" },
            { "internalType": "uint256", "name": "paymentAmount", "type": "uint256" }
        ],
        "name": "sendPurchaseRequest",
        "outputs": [{ "internalType": "bytes32", "name": "messageId", "type": "bytes32" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // estimateFee(franchiseId, tokenAmount, paymentAmount) → fee (LINK wei)
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId",   "type": "uint256" },
            { "internalType": "uint256", "name": "tokenAmount",   "type": "uint256" },
            { "internalType": "uint256", "name": "paymentAmount", "type": "uint256" }
        ],
        "name": "estimateFee",
        "outputs": [{ "internalType": "uint256", "name": "fee", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // PurchaseRequestSent event
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "internalType": "bytes32", "name": "messageId",     "type": "bytes32" },
            { "indexed": true,  "internalType": "address", "name": "buyer",         "type": "address" },
            { "indexed": true,  "internalType": "uint256", "name": "franchiseId",   "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "tokenAmount",   "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "paymentAmount", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "ccipFee",       "type": "uint256" }
        ],
        "name": "PurchaseRequestSent",
        "type": "event"
    }
] as const;

// ERC-20 minimal ABI — used for USDC and LINK approvals on Eth Sepolia
export const ERC20_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "owner",   "type": "address" },
            { "internalType": "address", "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "amount",  "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// ─── Admin ABIs ───────────────────────────────────────────────────────────────
// Extended ABIs used by AdminSection and MarketplaceSection for admin operations.

export const COMPLIANCE_ADMIN_ABI = [
    ...COMPLIANCE_ABI,
] as const;

export const DIVIDEND_ADMIN_ABI = [
    ...DIVIDEND_ABI,
    // depositDividends(franchiseId, amount)
    {
        "inputs": [
            { "internalType": "uint256", "name": "franchiseId", "type": "uint256" },
            { "internalType": "uint256", "name": "amount",      "type": "uint256" }
        ],
        "name": "depositDividends",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // performUpkeep(performData) — used to manually trigger a dividend cycle
    {
        "inputs": [
            { "internalType": "bytes", "name": "performData", "type": "bytes" }
        ],
        "name": "performUpkeep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
] as const;

export const FRANCHISE_ADMIN_ABI = [
    ...FRANCHISE_ABI,
    // createFranchise(name, totalValue, maxSupply, manager)
    {
        "inputs": [
            { "internalType": "string",  "name": "name",       "type": "string"  },
            { "internalType": "uint256", "name": "totalValue", "type": "uint256" },
            { "internalType": "uint256", "name": "_maxSupply", "type": "uint256" },
            { "internalType": "address", "name": "manager",    "type": "address" }
        ],
        "name": "createFranchise",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
] as const;
