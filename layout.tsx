import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { SocketProvider } from "@/components/SocketProvider";

const monumentExtended = localFont({
  src: "./fonts/MonumentExtended-Bold.woff2",
  variable: "--font-monument",
  weight: "700",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "LetsGoDuel | GameFi Arena",
  description: "More gunpowder for pump.fun. Designed for Alexander Pushkin.",
  openGraph: {
    title: "LetsGoDuel",
    description: "High-frequency token duels on Solana",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${monumentExtended.variable} ${jetbrainsMono.variable} antialiased bg-arena-darker text-white overflow-x-hidden`}
      >
        <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none z-0" />
        <div className="fixed inset-0 bg-radial-red pointer-events-none z-0" />
        
        <WalletProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
