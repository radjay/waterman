export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    epic: "text-green-700 border border-green-700/30 bg-green-700/5 px-1.5 py-0.5 font-body font-semibold text-[0.6rem] uppercase tracking-wider inline-block leading-[1.4] rounded-ui",
    default: "text-faded-ink border border-ink/10 bg-ink/5 px-1.5 py-0.5 font-body font-semibold text-[0.6rem] uppercase tracking-wider inline-block leading-[1.4] rounded-ui",
  };

  return (
    <div className={`${variants[variant]} ${className}`}>{children}</div>
  );
}
