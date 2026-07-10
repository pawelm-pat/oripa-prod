import type { Metadata } from "next";
import { Noto_Sans_JP, Geist_Mono } from "next/font/google";
import "./globals.css";

// Match the Figma design system (Noto Sans JP). The variable font covers the
// full weight range (400–900) used across the UI. CJK families are split into
// 100+ unicode-range files on Google Fonts, so we must NOT restrict to the
// latin subset (that drops Japanese glyphs) — instead disable preload, which
// pulls every range incl. Japanese. See vercel/next.js#44594.
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  preload: false,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oripa PROD",
  description: "Near-production Oripa client preview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0f1014] text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
