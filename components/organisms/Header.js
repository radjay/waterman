import { formatFullDate } from "../../lib/utils";

export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());

  return (
    <header
      className={`text-center border-b-4 border-double border-ink pb-6 mb-8 ${className}`}
    >
      <h1 className="font-headline text-[3.5rem] font-black uppercase tracking-[-2px] leading-none mb-2 text-ink">
        The Waterman Report
      </h1>
      <div className="flex justify-between border-t border-b border-ink py-2 font-headline font-bold uppercase text-[0.9rem]">
        <span>Vol. 1</span>
        <span>{todayStr}</span>
        <span>Lisbon, PT</span>
      </div>
    </header>
  );
}

