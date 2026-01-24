"use client";

import { useMemo } from "react";
import { ConvexProvider as ConvexReactProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";

export function ConvexProvider({ children }) {
  const convex = useMemo(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }, []);

  return <ConvexReactProvider client={convex}>{children}</ConvexReactProvider>;
}
