export function TideIndicator({ type, className = "" }) {
  if (!type) return null;
  
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase ${className}`}>
      {type === "high" ? "↑" : "↓"}
    </span>
  );
}



