import type { MetadataRoute } from "next";
import { getNow } from "@/content/now";
import { projects } from "@/content/work";
import { allRoutes, legalRoutes, siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = await getNow();
  return [
    ...allRoutes.map((route) => ({
      url: new URL(route.href, base).toString(),
      ...(route.href === "/now" ? { lastModified: now.updated } : {}),
      changeFrequency: route.href === "/" || route.href === "/now" ? ("weekly" as const) : ("monthly" as const),
      priority: route.href === "/" ? 1 : 0.7,
    })),
    ...legalRoutes.map((r) => ({ url: new URL(r.href, base).toString(), changeFrequency: "yearly" as const, priority: 0.3 })),
    ...projects.map((p) => ({ url: new URL(`/work/${p.slug}`, base).toString(), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
