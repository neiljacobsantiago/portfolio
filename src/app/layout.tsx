import type { Metadata, Viewport } from "next";
import { Courier_Prime, Gloock, Newsreader } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";
import ChatLauncher from "@/components/chat/ChatLauncher";
import CustomCursor from "@/components/effects/CustomCursor";
import PaperField from "@/components/effects/PaperField";
import RevealObserver from "@/components/effects/RevealObserver";
import SiteEffects from "@/components/effects/SiteEffects";
import { site, siteUrl } from "@/lib/site";

const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock" });
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader" });
const mono = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier-prime" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [{ url: "/njs_p.jpg", alt: site.name }],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
};

export const viewport: Viewport = {
  themeColor: "#fdf0d5",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden antialiased">
        <a href="#main" className="label sr-only z-[100] bg-ember px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <PaperField />
        <NavBar />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
        <ChatLauncher />
        <CustomCursor />
        <RevealObserver />
        <SiteEffects />
      </body>
    </html>
  );
}
