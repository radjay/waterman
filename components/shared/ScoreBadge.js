"use client";

/**
 * ScoreBadge Component
 *
 * Displays a 0-100 pulse score with color coding:
 * - 0-40: Gray (poor conditions)
 * - 41-60: Yellow (marginal conditions)
 * - 61-80: Green (good conditions)
 * - 81-100: Emerald/Gold (epic conditions)
 */

export function ScoreBadge({ score, size = "default", showLabel = false }) {
  if (score === null || score === undefined) {
    return (
      <div className={`flex items-center justify-center ${getSizeClasses(size)}`}>
        <span className="text-ink/40 font-mono text-sm">--</span>
      </div>
    );
  }

  const { bgColor, textColor, borderColor, label } = getScoreColors(score);

  if (size === "large") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`flex items-center justify-center rounded-full ${bgColor} ${borderColor} border-2 ${getSizeClasses(
            size
          )}`}
        >
          <span className={`font-mono font-bold ${textColor} ${getTextSize(size)}`}>
            {Math.round(score)}
          </span>
        </div>
        {showLabel && (
          <span className={`text-xs font-bold uppercase ${textColor}`}>{label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full ${bgColor} ${borderColor} border-2 ${getSizeClasses(
        size
      )}`}
    >
      <span className={`font-mono font-bold ${textColor} ${getTextSize(size)}`}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function getScoreColors(score) {
  if (score >= 81) {
    return {
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-800",
      borderColor: "border-emerald-600",
      label: "Epic",
    };
  } else if (score >= 61) {
    return {
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-500",
      label: "Good",
    };
  } else if (score >= 41) {
    return {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-500",
      label: "Fair",
    };
  } else {
    return {
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
      borderColor: "border-gray-400",
      label: "Poor",
    };
  }
}

function getSizeClasses(size) {
  switch (size) {
    case "small":
      return "w-10 h-10";
    case "large":
      return "w-16 h-16";
    case "default":
    default:
      return "w-12 h-12";
  }
}

function getTextSize(size) {
  switch (size) {
    case "small":
      return "text-sm";
    case "large":
      return "text-2xl";
    case "default":
    default:
      return "text-base";
  }
}
