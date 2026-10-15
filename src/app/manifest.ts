import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Lets phones save the site to the home screen with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Neil Jacob",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fdf0d5",
    theme_color: "#fdf0d5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
