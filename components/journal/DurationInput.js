"use client";

export function DurationInput({ value, onChange }) {
  const presets = [
    { label: "30m", minutes: 30 },
    { label: "1h", minutes: 60 },
    { label: "1.5h", minutes: 90 },
    { label: "2h", minutes: 120 },
    { label: "2.5h", minutes: 150 },
    { label: "3h", minutes: 180 },
  ];

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => onChange(preset.minutes)}
            className={`px-4 py-2 rounded-md border-2 transition-all ${
              value === preset.minutes
                ? "border-ink bg-ink/5"
                : "border-ink/20 hover:border-ink/30"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-ink/70">Custom:</label>
        <input
          type="number"
          min="1"
          max="480"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) {
              onChange(val);
            }
          }}
          placeholder="Minutes"
          className="w-24 px-3 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
        />
        <span className="text-sm text-ink/60">
          ({formatDuration(value)})
        </span>
      </div>
    </div>
  );
}

export function DurationDisplay({ minutes }) {
  const formatDuration = (mins) => {
    if (mins < 60) {
      return `${mins} minutes`;
    }
    const hours = Math.floor(mins / 60);
    const minsRemainder = mins % 60;
    if (minsRemainder === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ${minsRemainder} minute${minsRemainder !== 1 ? "s" : ""}`;
  };

  return <span className="text-ink">{formatDuration(minutes)}</span>;
}
