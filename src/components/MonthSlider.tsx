const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const STOPS = 12;
const THUMB_PX = 18;

interface Props {
  month: number;
  onChange: (month: number) => void;
}

export function MonthSlider({ month, onChange }: Props) {
  return (
    <div>
      <label htmlFor="month-slider" className="block text-sm font-medium text-gray-300 mb-1">
        Month: <span className="text-white font-semibold">{MONTH_NAMES[month - 1]}</span>
      </label>
      <input
        id="month-slider"
        aria-valuetext={MONTH_NAMES[month - 1]}
        type="range"
        min={1}
        max={12}
        step={1}
        value={month}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400 pointer-coarse:h-11"
      />
      <div className="relative h-4 mt-0.5" aria-hidden="true">
        {INITIALS.map((initial, i) => (
          <span
            key={i}
            className={`absolute text-[11px] -translate-x-1/2 ${
              i + 1 === month ? "text-amber-400 font-semibold" : "text-gray-400"
            }`}
            style={{
              left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${i / (STOPS - 1)})`,
            }}
          >
            {initial}
          </span>
        ))}
      </div>
    </div>
  );
}
