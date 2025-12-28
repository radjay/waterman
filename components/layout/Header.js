import { formatFullDate } from "../../lib/utils";

export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());

  return (
    <header
      className={`text-center border-b-2 border-ink/20 pb-4 mb-6 pt-6 md:pt-0 ${className}`}
    >
      <h1 className="font-headline text-[1.8rem] md:text-[3.5rem] font-black uppercase tracking-[-2px] leading-none mb-3 text-ink">
        The Waterman Report
      </h1>
      <div className="flex justify-center font-headline font-bold uppercase text-[0.9rem] text-ink py-4">
        <span>{todayStr}</span>
      </div>
    </header>
  );
}
