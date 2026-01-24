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
      <div className="flex flex-col items-center justify-center gap-2">
        {formattedDateTime && (
          <div className="text-xs text-ink/60 font-body">
            Last updated: {formattedDateTime}
          </div>
        )}
      </div>
    </footer>
  );
}


