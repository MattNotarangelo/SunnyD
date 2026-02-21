import { legendEntries } from "../model/colorScale";

const entries = legendEntries(7);

export function ColorLegend() {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Minutes Required
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
        <span
          className="inline-block w-3 h-3 rounded"
          style={{ backgroundColor: "rgb(136,136,136)" }}
        />
        Insufficient UV
      </div>
    </div>
  );
}
