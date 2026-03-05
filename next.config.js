/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/healing", destination: "/tech-agents?tab=healing", permanent: false },
      { source: "/database", destination: "/tech-agents?tab=database", permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};
module.exports = nextConfig;
