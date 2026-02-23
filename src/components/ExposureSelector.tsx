import { useState } from "react";

const PRESET_LABELS: Record<string, string> = {
  face_hands: "Winter Clothing",
  tshirt_shorts: "T-shirt + Shorts",
  swimsuit: "Swimsuit",
};

interface Props {
  coverage: number;
  coveragePreset: string | null;
  presets: Record<string, number>;
  onChange: (coverage: number, preset: string | null) => void;
}

export function ExposureSelector({ coverage, coveragePreset, presets, onChange }: Props) {
  const [customValue, setCustomValue] = useState(coveragePreset === null ? String(coverage) : "");
  const isCustom = coveragePreset === null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Skin Exposure{" "}
        {coveragePreset !== "weather_adjusted" && (
          <span className="text-gray-400 text-xs">({(coverage * 100).toFixed(0)}%)</span>
        )}
      </label>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => onChange(0.25, "weather_adjusted")}
          title="Estimates skin exposure from localised daily maximum temperature"
          className={`w-full py-1.5 px-3 rounded text-sm text-left transition-colors flex items-center ${
            coveragePreset === "weather_adjusted"
              ? "bg-amber-500 text-gray-900 font-medium"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span className="flex-1">Weather Adjusted</span>
          <span className="text-xs opacity-70 w-10 text-right">auto</span>
        </button>
        {Object.entries(presets).map(([key, val]) => (
          <button
            key={key}
            onClick={() => onChange(val, key)}
            className={`w-full py-1.5 px-3 rounded text-sm text-left transition-colors flex items-center ${
              coveragePreset === key
                ? "bg-amber-500 text-gray-900 font-medium"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <span className="flex-1">{PRESET_LABELS[key] || key}</span>
            <span className="text-xs opacity-70 w-10 text-right">{val}</span>
          </button>
        ))}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isCustom) {
                const next = String(coverage);
                setCustomValue(next);
                onChange(coverage, null);
                return;
              }
              const v = parseFloat(customValue) || 0.5;
              onChange(Math.max(0, Math.min(1, v)), null);
            }}
            className={`py-1.5 px-3 rounded text-sm transition-colors ${
              isCustom ? "bg-amber-500 text-gray-900 font-medium" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Custom
          </button>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={isCustom ? customValue : ""}
            placeholder="0.0-1.0"
            onChange={(e) => {
              setCustomValue(e.target.value);
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0 && v <= 1) {
                onChange(v, null);
              }
            }}
            className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1.5 w-20
                       border border-gray-600 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
