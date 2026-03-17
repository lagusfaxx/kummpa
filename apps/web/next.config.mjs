/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kumpa/ui", "@kumpa/types", "@kumpa/config"]
};

export default nextConfig;
