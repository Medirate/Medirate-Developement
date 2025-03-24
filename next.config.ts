import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "www.gravatar.com",
      "gravatar.com",
      "qpadwftthiuotvnchbvt.supabase.co" // Add your Supabase domain here
    ], // Add the allowed domains here
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint errors during builds
  },
};

export default nextConfig;
