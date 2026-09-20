// Allow local Windows TLS connections for live feeds
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [],
    remotePatterns: [],
  },
};

export default nextConfig;
