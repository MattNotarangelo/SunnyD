import { legendEntries, getActiveDarkRgb } from "../model/colorScale";

interface Props {
  colorblindMode: boolean;
}

/**
 * Horizontal key for the map surface on small screens, where the panel legend
 * is hidden. The dark tail past "4 h" is "not achievable".
 */
export function CompactLegend({ colorblindMode }: Props) {
  // Re-compute entries when palette changes (colorblindMode triggers re-render)
  void colorblindMode;
  const entries = legendEntries(7);

  return (
    <div
      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-lg"
      role="img"
      aria-label="Map key: from 5 minutes of midday sun (lightest need) to 4 hours; darkest areas are not achievable"
    >
      <div className="flex h-2 overflow-hidden rounded-full ring-1 ring-white/20">
        <div
          className="flex-[5]"
          style={{ background: `linear-gradient(to right, ${entries.map((e) => e.color).join(", ")})` }}
        />
        <div className="flex-1" style={{ backgroundColor: getActiveDarkRgb() }} />
      </div>
      <div className="relative mt-1 h-3 text-[11px] leading-none text-gray-300 tabular-nums">
        <span className="absolute left-0">5 min</span>
        <span className="absolute left-[83.3%] -translate-x-1/2">4 h</span>
      </div>
    </div>
  );
}
