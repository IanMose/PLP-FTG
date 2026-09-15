/** @type {import('next').NextConfig} */
const nextConfig = {
  // allowedDevOrigins is dev-only — safe to leave but has no effect in production
  allowedDevOrigins: ["172.16.3.186"],
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable Turbopack to avoid filesystem path issues (must be object, not boolean)
  // turbopack: {},
  // Next.js's internal TS checker picks up src/test/ files which are excluded
  // from tsconfig.json. tsc --noEmit passes cleanly. ignoreBuildErrors lets
  // the build complete; the actual type gate is tsc --noEmit in CI.
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "./tsconfig.json",
  },
  // Image optimization — disabled for Vercel compatibility with large images
  images: {
    unoptimized: true,
  },
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
