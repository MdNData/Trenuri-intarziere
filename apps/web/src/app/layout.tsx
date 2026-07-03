import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CFR Tracker - Întârzieri și Rambursări",
  description: "Verifică istoricul întârzierilor trenurilor CFR și generează automat cererea de rambursare.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={`${inter.variable} antialiased dark:bg-zinc-950 dark:text-zinc-50`}>
        {children}
      </body>
    </html>
  );
}
