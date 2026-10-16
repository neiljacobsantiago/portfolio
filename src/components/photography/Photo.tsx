"use client";

import Image, { type ImageProps } from "next/image";

/**
 * next/image for gallery photos. Cloudinary photos arrive with signed URLs per
 * width (`variants`); the browser gets the smallest one that fits, straight
 * from Cloudinary's CDN. Local photos go through Next's own optimizer.
 */
export default function Photo({ variants, alt, ...props }: ImageProps & { variants?: Record<number, string> }) {
  if (!variants) return <Image alt={alt} {...props} />;
  const widths = Object.keys(variants)
    .map(Number)
    .sort((a, b) => a - b);
  return <Image alt={alt} {...props} loader={({ width }) => variants[widths.find((w) => w >= width) ?? widths[widths.length - 1]]} />;
}
