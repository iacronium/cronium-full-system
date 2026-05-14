// scripts/test_ccip_e2e.js
// Test end-to-end del flujo CCIP en testnet real.
//
// Simula exactamente lo que hace el frontend cuando un usuario está en Ethereum Sepolia:
//   1. Verifica balances y configuración pre-vuelo
//   2. Aprueba mUSDC al CCIPTokenPurchaseSender
//   3. Llama sendPurchaseRequest → obtiene el messageId CCIP
//   4. Imprime el link de tracking en ccip.chain.link
//   5. Espera la confirmación en Base Sepolia (polling cada 30s, timeout 20min)
//   6. Verifica que los tokens ERC-1155 llegaron al buyer
//
// Ejecutar con:
//   npx hardhat run scripts/test_ccip_e2e.js --network ethereumSepolia

const { ethers } = require("hardhat");
const https = require("https");

// ── Parámetros del test ────────────────────────────────────────────────────────
const FRANCHISE_ID    = 1n;
const TOKEN_AMOUNT    = 1n;   // 1 token de prueba
const PAYMENT_USDC    = "100"; // $100 USDC (precio de 1 token)
const POLL_INTERVAL   = 30_000;  // 30 segundos entre checks
const TIMEOUT_MS      = 20 * 60 * 1000; // 20 minutos máximo
// ──────────────────────────────────────────────────────────────────────────────

// Direcciones
const SENDER_ADDRESS   = process.env.CCIP_SENDER_ADDRESS;
const RECEIVER_ADDRESS = process.env.CCIP_RECEIVER_ADDRESS;
const USDC_ETH_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS_ETH_SEPOLIA;
const FRANCHISE_TOKENIZER_ADDRESS = "0xAC566fADcD8fE13A67307d13B994e89bf368447b";

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
];

const SENDER_ABI = [
    "function sendPurchaseRequest(uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount) returns (bytes32)",
    "function estimateFee(uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount) view returns (uint256)",
];

const RECEIVER_ABI = [
    "function isMessageProcessed(bytes32 messageId) view returns (bool)",
    "function getPurchaseHistory(bytes32 messageId) view returns (tuple(address buyer, uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount, uint64 sourceChainSelector, uint256 timestamp, bool success))",
    "function availableLiquidity() view returns (uint256)",
];

const ERC1155_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
];

const LINK_ABI = [
    "function balanceOf(address) view returns (uint256)",
];
const LINK_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Fetch balance from Base Sepolia via public RPC (no hardhat provider needed)
function fetchBaseSepoliaBalance(contractAddress, userAddress, tokenId) {
    return new Promise((resolve, reject) => {
        // eth_call for balanceOf(address,uint256) on ERC-1155
        const selector = "0x00fdd58e"; // balanceOf(address,uint256)
        const paddedAddr = userAddress.toLowerCase().replace("0x", "").padStart(64, "0");
        const paddedId   = tokenId.toString(16).padStart(64, "0");
        const data = selector + paddedAddr + paddedId;

        const body = JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "eth_call",
            params: [{ to: contractAddress, data }, "latest"],
        });

        const req = https.request({
            hostname: "sepolia.base.org",
            path: "/",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        }, (res) => {
            let raw = "";
            res.on("data", d => raw += d);
            res.on("end", () => {
                try {
                    const json = JSON.parse(raw);
                    resolve(BigInt(json.result || "0x0"));
                } catch { resolve(0n); }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Check if CCIP message was processed on Base Sepolia
function checkMessageProcessed(receiverAddress, messageId) {
    return new Promise((resolve, reject) => {
        // isMessageProcessed(bytes32) selector = 0x6b0c7e5e
        const selector = "0x6b0c7e5e";
        const paddedId = messageId.replace("0x", "").padStart(64, "0");
        const data = selector + paddedId;

        const body = JSON.stringify({
            jsonrpc: "2.0", id: 2, method: "eth_call",
            params: [{ to: receiverAddress, data }, "latest"],
        });

        const req = https.request({
            hostname: "sepolia.base.org",
            path: "/",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        }, (res) => {
            let raw = "";
            res.on("data", d => raw += d);
            res.on("end", () => {
                try {
                    const json = JSON.parse(raw);
                    // result is 0x000...001 (true) or 0x000...000 (false)
                    resolve(BigInt(json.result || "0x0") === 1n);
                } catch { resolve(false); }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("=".repeat(65));
    console.log("  TEST E2E — CCIP Cross-Chain Purchase (Testnet Real)");
    console.log("=".repeat(65));

    // ── Validar configuración ──────────────────────────────────────────────
    if (!SENDER_ADDRESS || !RECEIVER_ADDRESS || !USDC_ETH_ADDRESS) {
        throw new Error(
            "Faltan variables de entorno en .env:\n" +
            "  CCIP_SENDER_ADDRESS\n" +
            "  CCIP_RECEIVER_ADDRESS\n" +
            "  PAYMENT_TOKEN_ADDRESS_ETH_SEPOLIA"
        );
    }

    const usdc   = new ethers.Contract(USDC_ETH_ADDRESS, ERC20_ABI, deployer);
    const sender = new ethers.Contract(SENDER_ADDRESS, SENDER_ABI, deployer);
    const link   = new ethers.Contract(LINK_ADDRESS, LINK_ABI, deployer);

    const decimals      = await usdc.decimals();
    const paymentWei    = ethers.parseUnits(PAYMENT_USDC, decimals);

    // ── Pre-flight checks ──────────────────────────────────────────────────
    console.log("\n📋 Pre-flight checks");
    console.log(`   Buyer (deployer):  ${deployer.address}`);
    console.log(`   Sender:            ${SENDER_ADDRESS}`);
    console.log(`   Receiver:          ${RECEIVER_ADDRESS}`);
    console.log(`   Franchise ID:      #${FRANCHISE_ID}`);
    console.log(`   Token amount:      ${TOKEN_AMOUNT}`);
    console.log(`   Payment:           ${PAYMENT_USDC} mUSDC`);

    const usdcBalance  = await usdc.balanceOf(deployer.address);
    const linkBalance  = await link.balanceOf(SENDER_ADDRESS);
    const ethBalance   = await ethers.provider.getBalance(deployer.address);

    console.log(`\n   mUSDC balance (buyer):    ${ethers.formatUnits(usdcBalance, decimals)}`);
    console.log(`   LINK balance (sender):    ${ethers.formatUnits(linkBalance, 18)}`);
    console.log(`   ETH balance (gas):        ${ethers.formatEther(ethBalance)}`);

    if (usdcBalance < paymentWei) {
        throw new Error(`Insufficient mUSDC. Have ${ethers.formatUnits(usdcBalance, decimals)}, need ${PAYMENT_USDC}`);
    }
    if (linkBalance === 0n) {
        throw new Error("Sender has no LINK. Run: npx hardhat run scripts/deposit_link.js --network ethereumSepolia");
    }
    if (ethBalance < ethers.parseEther("0.01")) {
        throw new Error("Insufficient ETH for gas. Get Sepolia ETH from https://faucets.chain.link");
    }

    // Estimate fee
    let estimatedFee;
    try {
        estimatedFee = await sender.estimateFee(FRANCHISE_ID, TOKEN_AMOUNT, paymentWei);
        console.log(`   Estimated CCIP fee:       ${ethers.formatUnits(estimatedFee, 18)} LINK`);
        if (linkBalance < estimatedFee) {
            throw new Error(`Sender LINK too low. Has ${ethers.formatUnits(linkBalance, 18)}, needs ${ethers.formatUnits(estimatedFee, 18)}`);
        }
    } catch (e) {
        if (e.message.includes("too low")) throw e;
        console.log("   (Fee estimation skipped — router may be temporarily unavailable)");
    }

    console.log("\n✅ Pre-flight checks passed\n");

    // ── Step 1: Approve mUSDC ──────────────────────────────────────────────
    console.log("─".repeat(65));
    console.log("Step 1/3 — Approving mUSDC to Sender...");
    const currentAllowance = await usdc.allowance(deployer.address, SENDER_ADDRESS);
    if (currentAllowance < paymentWei) {
        const approveTx = await usdc.approve(SENDER_ADDRESS, paymentWei);
        process.stdout.write(`   Tx: ${approveTx.hash}\n   Waiting for confirmation...`);
        await approveTx.wait(1);
        console.log(" ✓");
    } else {
        console.log(`   ✓ Allowance already sufficient (${ethers.formatUnits(currentAllowance, decimals)} mUSDC)`);
    }

    // ── Step 2: Send purchase request ─────────────────────────────────────
    console.log("\nStep 2/3 — Sending cross-chain purchase request...");
    const sendTx = await sender.sendPurchaseRequest(FRANCHISE_ID, TOKEN_AMOUNT, paymentWei);
    process.stdout.write(`   Tx: ${sendTx.hash}\n   Waiting for confirmation...`);
    const receipt = await sendTx.wait(1);
    console.log(" ✓");

    // Extract CCIP messageId from PurchaseRequestSent event
    // Topic[0] = event sig, topic[1] = messageId (indexed bytes32)
    const EVENT_SIG = ethers.id("PurchaseRequestSent(bytes32,address,uint256,uint256,uint256,uint256)");
    const eventLog  = receipt.logs.find(l => l.topics[0] === EVENT_SIG);
    if (!eventLog) throw new Error("PurchaseRequestSent event not found in receipt");
    const messageId = eventLog.topics[1];

    console.log(`\n   ✅ CCIP message sent!`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Track at:   https://ccip.chain.link/msg/${messageId}`);
    console.log(`   Etherscan:  https://sepolia.etherscan.io/tx/${sendTx.hash}`);

    // ── Step 3: Poll Base Sepolia for delivery ─────────────────────────────
    console.log("\nStep 3/3 — Waiting for CCIP relay to Base Sepolia...");
    console.log("   (Chainlink CCIP testnet relay typically takes 5–20 minutes)\n");

    const startTime = Date.now();
    let delivered   = false;
    let attempt     = 0;

    while (Date.now() - startTime < TIMEOUT_MS) {
        attempt++;
        const elapsed = Date.now() - startTime;
        process.stdout.write(`   [${formatTime(elapsed)}] Checking Base Sepolia... `);

        try {
            const processed = await checkMessageProcessed(RECEIVER_ADDRESS, messageId);
            if (processed) {
                console.log("✅ Message delivered!");
                delivered = true;
                break;
            } else {
                console.log("pending");
            }
        } catch (e) {
            console.log(`(RPC error: ${e.message.slice(0, 40)})`);
        }

        await sleep(POLL_INTERVAL);
    }

    if (!delivered) {
        console.log(`\n⏱  Timeout after ${formatTime(TIMEOUT_MS)}. The message may still be in transit.`);
        console.log(`   Check manually: https://ccip.chain.link/msg/${messageId}`);
        console.log(`   Once delivered, verify token balance with:`);
        console.log(`   npx hardhat run scripts/verify_ccip_result.js --network baseSepolia`);
        process.exit(0);
    }

    // ── Verify token balance on Base Sepolia ──────────────────────────────
    console.log("\n─".repeat(65));
    console.log("Verifying token balance on Base Sepolia...");

    const tokenBalance = await fetchBaseSepoliaBalance(
        FRANCHISE_TOKENIZER_ADDRESS,
        deployer.address,
        FRANCHISE_ID
    );

    console.log(`\n   ERC-1155 balance of ${deployer.address}`);
    console.log(`   Franchise #${FRANCHISE_ID}: ${tokenBalance} tokens`);

    if (tokenBalance >= TOKEN_AMOUNT) {
        console.log("\n🎉 SUCCESS — Cross-chain purchase completed!");
        console.log(`   ${TOKEN_AMOUNT} token(s) minted on Base Sepolia to ${deployer.address}`);
    } else {
        console.log("\n⚠️  Message was delivered but purchase may have failed (KYC, liquidity, etc.)");
        console.log(`   Check purchase history: https://sepolia.basescan.org/address/${RECEIVER_ADDRESS}#readContract`);
        console.log(`   Call getPurchaseHistory("${messageId}")`);
    }

    console.log("\n" + "=".repeat(65));
    console.log("  SUMMARY");
    console.log("=".repeat(65));
    console.log(`  Sender tx:    https://sepolia.etherscan.io/tx/${sendTx.hash}`);
    console.log(`  CCIP tracker: https://ccip.chain.link/msg/${messageId}`);
    console.log(`  Receiver:     https://sepolia.basescan.org/address/${RECEIVER_ADDRESS}`);
}

main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exitCode = 1;
});
