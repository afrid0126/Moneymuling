import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Web Worker support via webpack
  webpack: (config) => {
    config.output.globalObject = "self";
    return config;
  },
};

export default nextConfig;
