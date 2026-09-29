import { useState } from "react";

const PRESET_LABELS: Record<string, string> = {
  face_hands: "Winter clothing",
  tshirt_shorts: "T-shirt and shorts",
  swimsuit: "Swimsuit",
};

const optionClass = (active: boolean) =>
  `w-full py-1.5 pointer-coarse:py-3 px-3 rounded text-sm text-left transition-colors flex items-center ${
    active ? "bg-amber-500 text-gray-900 font-medium" : "bg-gray-700 text-gray-200 hover:bg-gray-600"
  }`;

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

interface Props {
  coverage: number;
  coveragePreset: string | null;
  presets: Record<string, number>;
  onChange: (coverage: number, preset: string | null) => void;
}

export function ExposureSelector({ coverage, coveragePreset, presets, onChange }: Props) {
  // The custom field edits a percentage; the model still takes a 0–1 fraction
  const [customValue, setCustomValue] = useState(
    coveragePreset === null ? String(Math.round(coverage * 100)) : "",
  );
  const [customError, setCustomError] = useState(false);
  const isCustom = coveragePreset === null;

  const applyCustom = (raw: string) => {
    setCustomValue(raw);
    const v = Number(raw);
    const valid = raw.trim() !== "" && Number.isFinite(v) && v >= 0 && v <= 100;
    setCustomError(!valid && raw.trim() !== "");
    if (valid) onChange(v / 100, null);
  };

  return (
    <div role="group" aria-labelledby="exposure-label">
      <p id="exposure-label" className="text-sm font-medium text-gray-300 mb-1">
        Skin exposure{" "}
        {coveragePreset !== "weather_adjusted" && (
          <span className="text-gray-400 text-xs">({pct(coverage)} of skin)</span>
        )}
      </p>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => onChange(0.25, "weather_adjusted")}
          title="Estimates skin exposure from the local daytime temperature"
          aria-pressed={coveragePreset === "weather_adjusted"}
          className={optionClass(coveragePreset === "weather_adjusted")}
        >
          <span className="flex-1">Weather adjusted</span>
          <span className="text-xs opacity-80 w-10 text-right">auto</span>
        </button>
        {Object.entries(presets).map(([key, val]) => (
          <button
            key={key}
            onClick={() => onChange(val, key)}
            aria-pressed={coveragePreset === key}
            className={optionClass(coveragePreset === key)}
          >
            <span className="flex-1">{PRESET_LABELS[key] || key}</span>
            <span className="text-xs opacity-80 w-10 text-right tabular-nums">{pct(val)}</span>
          </button>
        ))}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isCustom) {
                setCustomValue(String(Math.round(coverage * 100)));
                setCustomError(false);
                onChange(coverage, null);
                return;
              }
              applyCustom(customValue || "50");
            }}
            aria-pressed={isCustom}
            className={`py-1.5 pointer-coarse:py-3 px-3 rounded text-sm transition-colors ${
              isCustom ? "bg-amber-500 text-gray-900 font-medium" : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            }`}
          >
            Custom
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={1}
              value={isCustom ? customValue : ""}
              placeholder="0–100"
              aria-label="Custom skin exposure, percent"
              aria-invalid={customError}
              aria-describedby={customError ? "exposure-error" : undefined}
              onChange={(e) => applyCustom(e.target.value)}
              className={`w-full bg-gray-700 text-white text-base md:text-sm rounded pl-2 pr-7 py-1.5 pointer-coarse:py-2.5
                         border ${
                           customError ? "border-rose-400" : "border-gray-600 focus:border-amber-400"
                         }`}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
          </div>
        </div>
        {customError && (
          <p id="exposure-error" className="text-xs text-rose-300" role="alert">
            Enter a percentage from 0 to 100.
          </p>
        )}
      </div>
    </div>
  );
}
