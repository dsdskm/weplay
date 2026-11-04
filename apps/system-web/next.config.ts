import type { NextConfig } from 'next';

const config: NextConfig = {
    transpilePackages: ['@weplay/shared'],
    output: 'standalone',
    async rewrites() {
        return {
            beforeFiles: [{ source: '/terms', has: [{ type: 'query', key: 'type', value: '(?<legalType>SERVICE|PRIVACY)' }], destination: '/legal/terms?type=:legalType' }],
            afterFiles: [],
            fallback: [],
        };
    },
};
export default config;
