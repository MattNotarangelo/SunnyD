const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  month: number;
  onChange: (month: number) => void;
}

/** Compact month control for the map surface on small screens. Wraps Dec ↔ Jan. */
export function MonthStepper({ month, onChange }: Props) {
  const step = (delta: number) => onChange(((month - 1 + delta + 12) % 12) + 1);

  return (
    <div className="flex items-center rounded-lg border border-gray-700 bg-gray-900/95 shadow-lg">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous month"
        className="grid h-11 w-11 place-items-center text-gray-300 hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="min-w-[5.75rem] text-center text-sm font-medium text-white" aria-live="polite">
        {MONTH_NAMES[month - 1]}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next month"
        className="grid h-11 w-11 place-items-center text-gray-300 hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
