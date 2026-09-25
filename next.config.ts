import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the Action / gate Node ESM tree out of the Next bundle graph noise.
  serverExternalPackages: ['stripe'],
};

export default nextConfig;
