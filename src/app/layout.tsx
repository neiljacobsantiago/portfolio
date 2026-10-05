import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/ui/CustomCursor";
import NavBar from "@/components/ui/NavBar";

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NEIL.OS // Sys_Admin Portfolio",
  description: "Interactive Developer Portfolio & Network Infrastructure Engineering Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${fontDisplay.variable} ${fontMono.variable} font-mono bg-marine text-butter antialiased selection:bg-accentRed selection:text-marine overflow-x-hidden`}
      >
        <CustomCursor />
        <NavBar />
        {children}
      </body>
    </html>
  );
}