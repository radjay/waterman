export function Metric({ icon, children, className = "" }) {
  return (
    <div className={`flex items-center min-w-[90px] ${className}`}>
      {icon}
      <span className="font-data">{children}</span>
    </div>
  );
}



