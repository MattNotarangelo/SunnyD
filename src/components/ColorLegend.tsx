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
      <p className="text-sm font-medium text-gray-300 mb-1 text-balance">
        Midday sun for 1,000 IU of vitamin D
      </p>
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
        <span className="inline-block w-3 h-3 rounded ring-1 ring-inset ring-white/30" style={{ backgroundColor: darkColor }} />
        Not achievable (would need over 4 h)
      </div>
    </div>
  );
}
