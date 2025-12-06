export function Arrow({ direction, className = "" }) {
  return (
    <div
      className={`inline-block ${className}`}
      style={{
        transform: `rotate(${direction}deg)`,
      }}
    >
      ↑
    </div>
  );
}

