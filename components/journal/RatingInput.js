"use client";

import { Star } from "lucide-react";

export function RatingInput({ value, onChange, disabled = false }) {
  const handleClick = (rating) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={disabled}
          className={`transition-colors ${
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"
          }`}
        >
          <Star
            className={`w-8 h-8 ${
              star <= value
                ? "text-yellow-500 fill-yellow-500"
                : "text-ink/20"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-ink/60">
          {value === 1 && "Poor"}
          {value === 2 && "Below Average"}
          {value === 3 && "Average"}
          {value === 4 && "Good"}
          {value === 5 && "Epic"}
        </span>
      )}
    </div>
  );
}

export function RatingDisplay({ value }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= value
              ? "text-yellow-500 fill-yellow-500"
              : "text-ink/20"
          }`}
        />
      ))}
    </div>
  );
}
