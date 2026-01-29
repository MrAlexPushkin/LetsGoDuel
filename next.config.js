/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        'socket.io-client': 'socket.io-client/dist/socket.io.js',
      },
    },
  },
};

module.exports = nextConfig;
