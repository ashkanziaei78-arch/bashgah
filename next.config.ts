import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Without this Turbopack walks up to C:\Users\Ashkan.z looking for a
  // lockfile and treats the home directory as the project root.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
