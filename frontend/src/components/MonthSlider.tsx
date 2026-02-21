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

const LABELS = ["Jan", "Dec"];
const LABEL_INDICES = [0, 11];
const STOPS = 12;
const THUMB_PX = 18;

interface Props {
  month: number;
  onChange: (month: number) => void;
}

export function MonthSlider({ month, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Month: <span className="text-white font-semibold">{MONTH_NAMES[month - 1]}</span>
      </label>
      <input
        type="range"
        min={1}
        max={12}
        step={1}
        value={month}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
      <div className="relative h-4 mt-0.5">
        {LABELS.map((label, j) => (
          <span
            key={label}
            className="absolute text-[10px] text-gray-500 -translate-x-1/2"
            style={{
              left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${LABEL_INDICES[j] / (STOPS - 1)})`,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
