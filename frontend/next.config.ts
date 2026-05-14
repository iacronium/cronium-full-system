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
