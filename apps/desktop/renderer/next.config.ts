import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: isProd && !isVercel ? './' : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
