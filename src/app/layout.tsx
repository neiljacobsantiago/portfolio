import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";
import CustomCursor from "@/components/effects/CustomCursor";
import RevealObserver from "@/components/effects/RevealObserver";
import ChatLauncher from "@/components/chat/ChatLauncher";
import { site, siteUrl } from "@/lib/site";

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${site.shortName} // ${site.name}`, template: `%s // ${site.shortName}` },
  description: site.description,
  applicationName: site.shortName,
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.shortName,
    title: site.title,
    description: site.description,
    images: [{ url: "/njs_p.jpg", alt: site.name }],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
};

export const viewport: Viewport = {
  themeColor: "#021124",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden font-mono antialiased">
        <a
          href="#main"
          className="sr-only z-[100] bg-accentRed px-4 py-2 font-mono text-xs text-butter uppercase focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <NavBar />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <ChatLauncher />
        <CustomCursor />
        <RevealObserver />
      </body>
    </html>
  );
}
