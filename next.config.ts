import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
