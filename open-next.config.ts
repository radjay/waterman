import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/** Preview and first deploy: in-memory cache is enough. Add R2 in Unit 6 if ISR needs it. */
export default defineCloudflareConfig();
