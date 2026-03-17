/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@kumpa/ui", "@kumpa/types", "@kumpa/config"]
};

export default nextConfig;
