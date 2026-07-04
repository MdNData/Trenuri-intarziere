import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cfr-tracker/db", "@cfr-tracker/api"],
};

export default nextConfig;
