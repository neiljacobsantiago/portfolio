import type { MetadataRoute } from "next";
import { projects } from "@/content/work";
import { allRoutes, legalRoutes, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    ...allRoutes.map((route) => ({
      url: new URL(route.href, base).toString(),
      changeFrequency: route.href === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: route.href === "/" ? 1 : 0.7,
    })),
    ...legalRoutes.map((r) => ({ url: new URL(r.href, base).toString(), changeFrequency: "yearly" as const, priority: 0.3 })),
    ...projects.map((p) => ({ url: new URL(`/work/${p.slug}`, base).toString(), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
