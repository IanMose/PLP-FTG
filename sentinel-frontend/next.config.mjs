/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.16.3.186"],
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Limit dev server memory usage and parallelism
  experimental: {
    workerThreads: false,
    cpus: 2,
  },

};

export default nextConfig;
