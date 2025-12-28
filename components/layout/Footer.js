import { Calendar } from "lucide-react";

function formatDateTime(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function Footer({ className = "", mostRecentScrapeTimestamp }) {
  const formattedDateTime = formatDateTime(mostRecentScrapeTimestamp);

  return (
    <footer className={`mt-12 pt-8 border-t-2 border-ink/20 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-4">
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
        {formattedDateTime && (
          <div className="text-xs text-ink/60 font-body">
            Last updated: {formattedDateTime}
          </div>
        )}
      </div>
    </footer>
  );
}


