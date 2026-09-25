import type { NextConfig } from "next";
import path from "node:path";

/** Cover photos come from the project's own Storage bucket, so the
 *  allow-list is that one host rather than a wildcard. Derived from the
 *  configured URL instead of hard-coded: the staging and production
 *  projects have different refs, and a hard-coded host silently falls
 *  back to an unoptimised image on whichever one it does not match. */
function supabaseImageHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    return [
      {
        protocol: "https" as const,
        hostname: new URL(url).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Without this Turbopack walks up to C:\Users\Ashkan.z looking for a
  // lockfile and treats the home directory as the project root.
  turbopack: { root: path.resolve(".") },
  images: { remotePatterns: supabaseImageHost() },
};

export default nextConfig;
