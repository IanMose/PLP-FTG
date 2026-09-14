/** @type {import('next').NextConfig} */
const nextConfig = {
  // allowedDevOrigins is dev-only — safe to leave but has no effect in production
  allowedDevOrigins: ["172.16.3.186"],
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable Turbopack to avoid filesystem path issues
  turbopack: false,
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
