import { Calendar } from "lucide-react";

export function Footer({ className = "" }) {
  return (
    <footer className={`mt-12 pt-8 border-t-2 border-ink ${className}`}>
      <div className="flex items-center justify-center gap-4">
        <a
          href="/api/calendar/wingfoil"
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors text-xs uppercase font-body font-medium"
          title="Subscribe to wingfoil calendar feed"
        >
          <Calendar size={16} />
          <span>Wing Calendar</span>
        </a>
        <a
          href="/api/calendar/surfing"
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors text-xs uppercase font-body font-medium"
          title="Subscribe to surfing calendar feed"
        >
          <Calendar size={16} />
          <span>Surf Calendar</span>
        </a>
      </div>
    </footer>
  );
}

