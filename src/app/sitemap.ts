import type { MetadataRoute } from "next";
import { allRoutes, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return allRoutes.map((route) => ({
    url: new URL(route.href, base).toString(),
    changeFrequency: route.href === "/" ? "weekly" : "monthly",
    priority: route.href === "/" ? 1 : 0.7,
  }));
}
