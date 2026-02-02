
import type React from "react"

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AgentationProvider } from "@/components/agentation-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({
  variable: "--font-geist",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} font-sans antialiased`}
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <ThemeProvider>
          <main className="min-h-screen" style={{ background: 'var(--card-bg)' }}>
            {children}
          </main>
        </ThemeProvider>
        <AgentationProvider />
      </body>
    </html>
  );
}
