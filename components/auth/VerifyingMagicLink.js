"use client";

import { Loader2 } from "lucide-react";

export default function VerifyingMagicLink({ message = "Verifying your magic link..." }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <Loader2 className="w-12 h-12 text-ink animate-spin" />
      <p className="text-ink/70 text-center">{message}</p>
    </div>
  );
}
