import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Run on port 3001 so backend can stay on 3000
  // Start with: npm run dev -- -p 3001  (or set PORT=3001 in .env.local)
};

export default nextConfig;
