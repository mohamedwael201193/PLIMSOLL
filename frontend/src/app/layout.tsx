import type { Metadata, Viewport } from "next";
import { Michroma, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const display = Michroma({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const sans = Space_Grotesk({
  variable: "--font-sans-custom",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-custom",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLIMSOLL — The Market Has a Load Line",
  description:
    "PLIMSOLL estimates exit capacity under your stated constraints — then keeps re-solving as the market changes. Built with Binance Agent OS. Your portfolio value is not your exit capacity.",
  keywords: [
    "Plimsoll",
    "exit capacity",
    "load line",
    "Binance Agent OS",
    "liquidity",
    "order book",
    "market depth",
    "trading constraints",
  ],
  authors: [{ name: "Plimsoll" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "PLIMSOLL — The Market Has a Load Line",
    description:
      "Estimated exit capacity under your stated constraints. Your portfolio value is not your exit capacity.",
    siteName: "Plimsoll",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLIMSOLL — The Market Has a Load Line",
    description: "Estimated exit capacity under your stated constraints.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FCD535",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} antialiased bg-plimsoll-deep text-foreground overflow-x-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
