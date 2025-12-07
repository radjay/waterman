"use client";

export function TideTable({ tides, spotName, className = "" }) {
  if (!tides || tides.length === 0) {
    return null;
  }

  // Sort tides by time
  const sortedTides = [...tides].sort((a, b) => a.time - b.time);

  return (
    <div className={`mb-4 ${className}`}>
      <div className="font-headline text-sm font-bold text-ink mb-2 uppercase">
        {spotName} Tides
      </div>
      <div className="border border-ink">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink bg-ink/5">
              <th className="text-left p-2 font-headline font-bold text-ink">Time</th>
              <th className="text-left p-2 font-headline font-bold text-ink">Type</th>
              <th className="text-right p-2 font-headline font-bold text-ink">Height</th>
            </tr>
          </thead>
          <tbody>
            {sortedTides.map((tide, idx) => (
              <tr key={idx} className="border-b border-ink/30 last:border-b-0">
                <td className="p-2 font-body text-ink">{tide.timeStr}</td>
                <td className="p-2 font-body text-ink uppercase">
                  <span className={tide.type === "high" ? "font-bold" : ""}>
                    {tide.type}
                  </span>
                </td>
                <td className="p-2 font-body text-ink text-right">
                  {tide.height !== null ? `${tide.height.toFixed(1)}m` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

