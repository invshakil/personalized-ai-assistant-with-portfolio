import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript is checked in CI (verify job) before deploy; skip the expensive
  // re-check during next build so it doesn't OOM on the constrained droplet.
  typescript: {
    ignoreBuildErrors: true,
  },

  // @react-pdf/renderer imports Node.js built-ins (fs, canvas) at module level.
  // Without this, Next.js bundles polyfill shims for them into the server output
  // which corrupts the hydration JS and causes the browser tab to crash.
  serverExternalPackages: ["@react-pdf/renderer"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },

  // Baseline security headers applied to every response. These defend against
  // clickjacking, MIME-sniffing, referrer leakage and downgrade attacks. A full
  // Content-Security-Policy is intentionally omitted here: MUI/emotion inject
  // inline styles and Next injects inline bootstrap scripts, so a correct CSP
  // needs nonces — track that separately rather than ship a policy that breaks
  // the app or lulls with `unsafe-inline`.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
