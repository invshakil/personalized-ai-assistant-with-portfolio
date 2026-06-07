import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Syful Islam Shakil — Tech Lead & Full-Stack Engineer",
    template: "%s | Syful Islam Shakil",
  },
  description:
    "Tech Lead and Full-Stack Engineer based in Comilla, Bangladesh. 10+ years building SaaS platforms, working with European agencies and US-based startups.",
  keywords: [
    "Tech Lead Bangladesh",
    "Full Stack Developer Bangladesh",
    "React Developer Bangladesh",
    "Next.js Developer",
    "Remote developer Bangladesh",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className="font-sans antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
