import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets phones on the LAN load the dev server (e.g. testing on a real Android).
  allowedDevOrigins: ["192.168.100.182"],
  images: {
    // AVIF first: roughly half the bytes of JPEG for photos.
    formats: ["image/avif", "image/webp"],
  },
  // Routes from the previous version of the site, kept alive for old links.
  async redirects() {
    return [
      { source: "/systems", destination: "/work", permanent: true },
      { source: "/media", destination: "/photography", permanent: true },
      { source: "/gear", destination: "/about#gear", permanent: true },
      { source: "/clearance", destination: "/about#credentials", permanent: true },
      { source: "/logs", destination: "/about", permanent: true },
      { source: "/work/philmech-pathogen-classifier", destination: "/work/pathoscan", permanent: true },
      // Projects taken down from the site
      { source: "/work/clirdec-network", destination: "/work", permanent: false },
      { source: "/work/intrusion-auditing", destination: "/work", permanent: false },
      { source: "/work/osint-forensics", destination: "/work", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
