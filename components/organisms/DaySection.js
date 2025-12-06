import { ForecastSlot } from "./ForecastSlot";

export function DaySection({ day, slots, className = "" }) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="font-headline text-[1.8rem] font-bold border-b-2 border-ink mb-4 pb-1 sticky top-0 bg-newsprint z-10 text-ink">
        {day.toUpperCase()}
      </div>
      <div className="flex flex-col border-t border-ink">
        {slots.map((slot) => (
          <ForecastSlot key={slot._id} slot={slot} />
        ))}
      </div>
    </div>
  );
}

