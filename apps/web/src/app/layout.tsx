import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tren-Întârziat.ro - Mersul Real, Statistici Întârzieri și Compensații Trenuri",
  description: "Verifică mersul real al trenurilor din România, vezi media istorică a întârzierilor pe 3 luni pentru fiecare stație și generează automat cererea de despăgubire (25% sau 50%) cu IBAN/CNP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-50`}>
        {children}
      </body>
    </html>
  );
}
