import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [];
  },
  serverExternalPackages: [],
};

module.exports = {
  ...nextConfig,
  allowedDevOrigins: ['192.168.100.182'],
};

export default nextConfig;