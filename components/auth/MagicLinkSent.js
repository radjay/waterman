"use client";

import { Mail, ArrowLeft } from "lucide-react";

export default function MagicLinkSent({ email, onBack }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="bg-ink/5 rounded-full p-4">
          <Mail className="w-12 h-12 text-ink" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-ink">Check your email</h2>
        <p className="text-ink/70">
          We've sent a magic link to <strong>{email}</strong>
        </p>
      </div>

      <div className="bg-ink/5 border border-ink/10 rounded-lg p-4 text-left space-y-2">
        <p className="text-sm text-ink/80">
          <strong>Next steps:</strong>
        </p>
        <ol className="text-sm text-ink/70 space-y-1 list-decimal list-inside">
          <li>Check your inbox for an email from Waterman</li>
          <li>Click the "Sign In to Waterman" button in the email</li>
          <li>You'll be automatically signed in</li>
        </ol>
      </div>

      <div className="space-y-3 text-sm text-ink/60">
        <p>The link will expire in 15 minutes.</p>
        <p>
          Didn't receive the email? Check your spam folder or{" "}
          <button
            onClick={onBack}
            className="text-ink underline hover:no-underline"
          >
            try again
          </button>
          .
        </p>
      </div>

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-ink/70 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </div>
  );
}
