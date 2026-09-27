import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/ui/CustomCursor";
import SmoothScroll from "@/components/ui/SmoothScroll";
import NavBar from "@/components/ui/NavBar";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Neil Jacob Santiago | InfoSec & Media Production",
  description: "Portfolio of Neil Jacob Santiago - Network Systems, Infrastructure Engineering, and Multimedia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`antialiased ${spaceGrotesk.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className="bg-marine text-butter overflow-x-hidden cursor-none selection:bg-accentRed selection:text-marine" suppressHydrationWarning>
        <CustomCursor />
        <NavBar />
        <SmoothScroll>
          <div className="relative z-10 pt-24">
            {children}
          </div>
        </SmoothScroll>
      </body>
    </html>
  );
}