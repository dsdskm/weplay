import type { NextConfig } from 'next';

const config: NextConfig = { transpilePackages: ['@weplay/shared'], output: 'standalone' };
export default config;
