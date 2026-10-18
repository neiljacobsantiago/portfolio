import type { Metadata } from "next";
import Link from "next/link";
import PageHeader, { Container } from "@/components/layout/PageHeader";
import { getOffers } from "@/content/offers";
import { seriesList } from "@/content/series";
import { categories, projects, type Category } from "@/content/work";
import { allRoutes, legalRoutes, site } from "@/lib/site";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Site map",
  description: `Every page on ${site.name}'s website in one place: projects, photo collections, Lab tools, games and legal pages.`,
};

function Group({ title, items }: { title: string; items: { label: string; href: string; note?: string }[] }) {
  return (
    <section>
      <h2 className="label mb-4 border-b border-ink/15 pb-3 text-ember">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group block">
              <span className="font-serif text-lg transition-colors group-hover:text-ember">{i.label}</span>
              {i.note && <span className="block font-serif text-sm text-ink/70 italic">{i.note}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SiteMapPage() {
  const keys = Object.keys(categories) as Category[];
  const offers = await getOffers();
  return (
    <>
      <PageHeader eyebrow="Site map" title={<>Every page, <em className="font-serif text-ember">one list.</em></>} lead="For finding things fast — or for search engines, which also get it as /sitemap.xml." />
      <Container className="grid gap-12 pb-24 sm:grid-cols-2 md:pb-32 lg:grid-cols-4">
        <Group title="Pages" items={allRoutes.map((r) => ({ label: r.label, href: r.href, note: r.description }))} />
        <Group title="Work with me" items={[...offers.map((o) => ({ label: o.title, href: `/services#${o.id}`, note: o.price.label })), { label: "Colophon", href: "/uses#colophon", note: "How this site is built" }]} />
        {keys.map((k) => (
          <Group key={k} title={categories[k].label} items={projects.filter((p) => p.category === k).map((p) => ({ label: p.title, href: `/work/${p.slug}`, note: p.context }))} />
        ))}
        <Group title="Photography" items={seriesList.map((s) => ({ label: s.title, href: `/photography#${s.slug}` }))} />
        <Group title="The Lab" items={tools.map((t) => ({ label: t.title, href: `/lab#${t.id}` }))} />
        <Group title="Legal & help" items={legalRoutes.map((r) => ({ label: r.label, href: r.href, note: r.description }))} />
      </Container>
    </>
  );
}
