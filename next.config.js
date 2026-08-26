/** @type {import('next').NextConfig} */
const nextConfig = {
    // Server Actions are enabled by default in recent Next.js versions
    // cacheComponents hangs on OpenNext Workers without an R2 incremental
    // cache. Restore it in Unit 6 if we add that cache.
}

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

