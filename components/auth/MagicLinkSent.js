"use client";

import { Mail } from "lucide-react";

export default function MagicLinkSent({ email, onBack }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Mail className="w-16 h-16 text-ink/60" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-ink">Check your email</h2>
        <p className="text-ink/70">
          We sent a sign-in link to<br />
          <span className="font-medium text-ink">{email}</span>
        </p>
      </div>

      <div className="text-sm text-ink/60 space-y-2">
        <p>Didn't receive it?{" "}
          <button
            onClick={onBack}
            className="text-ink underline hover:no-underline"
          >
            Try again
          </button>
        </p>
      </div>
    </div>
  );
}
