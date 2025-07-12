import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static generation optimizations
  experimental: {
    // Enable partial pre-rendering for better performance
    ppr: false, // Keep disabled for compatibility
  },
  
  // Optimize images for static generation
  images: {
    unoptimized: false, // Keep optimized for better performance
    domains: [], // Add any external image domains if needed
  },
  
  // Enable compression
  compress: true,
  
  // Generate sitemap during build
  generateBuildId: async () => {
    // Use timestamp for build ID to enable proper caching
    return `build-${Date.now()}`;
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        // Cache static assets
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      {
        // Cache word pages for 1 hour, revalidate in background
        source: "/w/:word*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
