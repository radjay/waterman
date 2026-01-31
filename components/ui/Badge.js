export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    epic: "text-green-700 border border-green-700 px-1 font-headline font-bold text-[0.6rem] uppercase tracking-[0.5px] inline-block leading-[1.4]",
    default: "",
  };

  return (
    <div className={`${variants[variant]} ${className}`}>{children}</div>
  );
}



