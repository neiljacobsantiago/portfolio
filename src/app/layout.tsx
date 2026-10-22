import type { Metadata, Viewport } from "next";
import { Gloock, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";
import ChatLauncher from "@/components/chat/ChatLauncher";
import PaletteHost from "@/components/search/PaletteHost";
import PaperField from "@/components/effects/PaperField";
import RevealObserver from "@/components/effects/RevealObserver";
import PageTransition from "@/components/effects/PageTransition";
import SiteEffects from "@/components/effects/SiteEffects";
import ImageShield from "@/components/effects/ImageShield";
import Shortcuts from "@/components/effects/Shortcuts";
import TapGuard from "@/components/effects/TapGuard";
import { site, siteUrl, socials } from "@/lib/site";

const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock" });
// Optical sizing keeps the serif sturdy at small sizes instead of thin and faint.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-newsreader" });
// Labels: a mono with real weight, readable at small sizes on any screen.
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

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
  appleWebApp: { capable: true, title: "Neil Jacob", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fdf0d5",
  colorScheme: "light",
  // Draw under the notch and home bar; components pad with env(safe-area-inset-*)
  viewportFit: "cover",
};

/** Structured data so search engines understand who the site is about. */
function StructuredData() {
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${url}/#neil`,
        name: site.name,
        url,
        image: `${url}/njs_p.jpg`,
        jobTitle: site.role,
        description: site.description,
        address: { "@type": "PostalAddress", addressLocality: "San Jose City", addressRegion: "Nueva Ecija", addressCountry: "PH" },
        affiliation: { "@type": "CollegeOrUniversity", name: "Central Luzon State University", url: "https://clsu.edu.ph" },
        knowsAbout: ["Network planning", "Network topology and cabling", "Subnetting and VLANs", "Web systems", "UI/UX design", "Security awareness", "Photography", "Videography"],
        sameAs: socials.filter((s) => s.url).map((s) => s.url),
      },
      { "@type": "WebSite", "@id": `${url}/#site`, url, name: site.name, inLanguage: "en", publisher: { "@id": `${url}/#neil` } },
    ],
  };
  // JSON-LD has to be inline; the content is our own static data.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const LOW_POWER_PROBE = `try{var n=navigator,c=n.connection||{};if(matchMedia("(prefers-reduced-motion: reduce)").matches||(n.deviceMemory||8)<=2||(n.hardwareConcurrency||8)<=2||c.saveData||/(^|-)2g$/.test(c.effectiveType||""))document.documentElement.classList.add("low-power")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden antialiased" suppressHydrationWarning>
        {/* Budget phones get the static layouts from the first paint, not after hydration (same test as lib/device.ts). */}
        <script dangerouslySetInnerHTML={{ __html: LOW_POWER_PROBE }} />
        <StructuredData />
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
        <PaletteHost />
        <RevealObserver />
        <SiteEffects />
        <ImageShield />
        <TapGuard />
        <Shortcuts />
        <PageTransition />
      </body>
    </html>
  );
}
