import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Security headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent the page from being embedded in an iframe (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer information sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features not needed by the app
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Basic HSTS — enforce HTTPS for 1 year
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content-Security-Policy — restricts sources to prevent XSS.
          // Critical for a dApp: an XSS attack could silently redirect
          // signed transactions to an attacker-controlled address.
          //
          // connect-src allows:
          //   - Same origin
          //   - Alchemy RPC endpoints (Base Sepolia & Eth Sepolia)
          //   - WalletConnect relay and RPC bridge
          //   - Coinbase Wallet SDK
          // img-src allows:
          //   - Same origin, inline data URIs (base64 token metadata), and HTTPS
          // style-src allows:
          //   - Same origin + inline styles (required by Tailwind / CSS-in-JS)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval'",   // 'unsafe-eval' required by wagmi/viem WASM
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.alchemy.com https://*.alchemyapi.io wss://*.walletconnect.org https://*.walletconnect.org https://rpc.walletconnect.com https://*.coinbase.com https://sepolia.base.org",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ─── Remote image patterns ───────────────────────────────────────────────────
  // Required for next/image to load images from external domains.
  // The component currently uses <img> tags — migrate to <Image /> to benefit from
  // automatic optimization (lazy loading, WebP conversion, size hints).
  images: {
    remotePatterns: [
      {
        // GitHub avatars used in ActiveInvestments portfolio items
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
      {
        // McDonald's logo loaded from Wikimedia Commons in the franchise card
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
    ],
  },
};

export default nextConfig;
