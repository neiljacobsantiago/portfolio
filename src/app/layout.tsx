import type { Metadata, Viewport } from "next";
import { Courier_Prime, Gloock, Newsreader } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import Footer from "@/components/layout/Footer";
import ChatLauncher from "@/components/chat/ChatLauncher";
import PaletteHost from "@/components/search/PaletteHost";
import CustomCursor from "@/components/effects/CustomCursor";
import PaperField from "@/components/effects/PaperField";
import RevealObserver from "@/components/effects/RevealObserver";
import PageTransition from "@/components/effects/PageTransition";
import SiteEffects from "@/components/effects/SiteEffects";
import { site, siteUrl, socials } from "@/lib/site";

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
        knowsAbout: ["Network design", "Network security", "Web development", "UI/UX design", "Photography", "Videography"],
        sameAs: socials.filter((s) => s.url).map((s) => s.url),
      },
      { "@type": "WebSite", "@id": `${url}/#site`, url, name: site.name, inLanguage: "en", publisher: { "@id": `${url}/#neil` } },
    ],
  };
  // JSON-LD has to be inline; the content is our own static data.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden antialiased" suppressHydrationWarning>
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
        <CustomCursor />
        <RevealObserver />
        <SiteEffects />
        <PageTransition />
      </body>
    </html>
  );
}
