function getRelativeTime(timestamp) {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function Footer({ className = "", mostRecentScrapeTimestamp }) {
  const relativeTime = getRelativeTime(mostRecentScrapeTimestamp);

  return (
    <footer className={`mt-12 pt-8 border-t-2 border-ink/20 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        {relativeTime && (
          <div className="text-xs text-ink/60 font-body">
            Updated {relativeTime}
          </div>
        )}
      </div>
    </footer>
  );
}


