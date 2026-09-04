import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "../styles/tailwind.css";
import "../styles/globals.scss";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sshakil.com"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Syful Islam Shakil — Tech Lead & Full-Stack Engineer",
    template: "%s | Syful Islam Shakil",
  },
  description:
    "Senior full-stack engineer and tech lead, 10+ years. Available now for European remote contracts. 6 years building a UK B2B SaaS platform serving 22M profiles.",
  keywords: [
    "European remote contractor",
    "B2B contractor engineer",
    "Senior Full Stack Engineer remote",
    "React Developer remote",
    "Next.js Developer",
    "Tech Lead Bangladesh",
    "Syful Islam Shakil",
    "sshakil.com",
  ],
  authors: [{ name: "Syful Islam Shakil" }],
  creator: "Syful Islam Shakil",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sshakil.com",
    siteName: "Syful Islam Shakil",
    title: "Syful Islam Shakil — Tech Lead & Full-Stack Engineer",
    description: "Tech Lead and Full-Stack Engineer based in Comilla, Bangladesh.",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "mg-QRGTfLp9sl2HlnLsm29NsXOlCdG3xqTAo2OebUeA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Syful Islam Shakil — Software Engineer & Tech Lead",
    description:
      "Senior full-stack engineer and tech lead, 10+ years. Available now for European remote contracts. 6 years building a UK B2B SaaS platform serving 22M profiles.",
    // OG/Twitter images are supplied by the app/opengraph-image.tsx convention.
  },
  other: {
    "geo.region": "BD-B",
    "geo.placename": "Comilla, Bangladesh",
    "geo.position": "23.4607;91.1809",
    ICBM: "23.4607, 91.1809",
    language: "English",
    "revisit-after": "7 days",
    coverage: "Bangladesh, South Asia, Worldwide",
    distribution: "Global",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes like data-gr-ext-installed onto <body> before React
          hydrates, which would otherwise log a benign hydration mismatch. */}
      <body className="font-sans antialiased text-gray-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
