"use client";

import { ConvexProvider as ConvexReactProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";

// Module-level singleton — instantiated once at import time, not during render,
// so Next.js static prerendering doesn't flag the Math.random() in the constructor.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexProvider({ children }) {
  return <ConvexReactProvider client={convex}>{children}</ConvexReactProvider>;
}
