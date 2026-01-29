
import type React from "react"

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade Analytics",
  description: "Trade journal and analytics for discretionary breakout trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
     <body
  className={`${inter.variable} font-sans antialiased bg-zinc-50 text-zinc-900`}
>
  <main className="min-h-screen bg-white">
    {children}
  </main>
</body>

    </html>
  );
}
