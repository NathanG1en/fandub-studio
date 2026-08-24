const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent disk caching in dev mode to prevent ENOENT webpack pack.gz corruption
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/storage/:path*',
        destination: 'http://127.0.0.1:8000/storage/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
