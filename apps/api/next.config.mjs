/** @type {import('next').NextConfig} */
const nextConfig = {
  // native module, must not be bundled
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
