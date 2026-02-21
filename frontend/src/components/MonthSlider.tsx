const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
        <span>Jan</span>
        <span>Jul</span>
        <span>Dec</span>
      </div>
    </div>
  );
}
