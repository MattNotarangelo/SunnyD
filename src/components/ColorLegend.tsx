import { legendEntries, getActiveDarkRgb } from "../model/colorScale";

interface Props {
  colorblindMode: boolean;
}

export function ColorLegend({ colorblindMode }: Props) {
  // Re-compute entries when palette changes (colorblindMode triggers re-render)
  void colorblindMode;
  const entries = legendEntries(7);
  const darkColor = getActiveDarkRgb();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Sun exposure needed to reach recommended Vitamin D intake (1000 IU)
      </label>
      <div className="flex items-stretch gap-2">
        <div
          className="w-4 rounded"
          style={{
            background: `linear-gradient(to bottom, ${entries.map((e) => e.color).join(", ")})`,
          }}
        />
        <div className="flex flex-col justify-between text-xs text-gray-400 py-0.5">
          {entries.map((e, i) => (
            <span key={i}>{e.minutes < 100 ? e.minutes.toFixed(0) : Math.round(e.minutes)} min</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: darkColor }} />
        &gt;240 min / Insufficient UV
      </div>
    </div>
  );
}
