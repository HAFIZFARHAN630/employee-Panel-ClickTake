import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STATIC_BUILD === "1" ? "export" : "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-865e345c-1409-438c-918b-8d8baedfab1e.space-z.ai",
  ],
};

export default nextConfig;
