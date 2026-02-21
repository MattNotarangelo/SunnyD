import { useEffect, useState } from "react";
import { fetchEstimate } from "../api/estimate";
import type { EstimateResponse, ModelParams } from "../types";
import { computeMinutes } from "../model/vitd";

interface Props {
  lat: number;
  lon: number;
  month: number;
  modelParams: ModelParams;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

export function Tooltip({ lat, lon, month, modelParams, onClose }: Props) {
  const [serverResult, setServerResult] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setServerResult(null);
    fetchEstimate({
      lat,
      lon,
      month,
      skinType: (() => {
        for (const [k, v] of Object.entries({ 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 2.8, 6: 3.8 })) {
          if (v === modelParams.kSkin) return Number(k);
        }
        return 2;
      })(),
      coverage: modelParams.fCover,
    })
      .then(setServerResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lat, lon, month, modelParams]);

  const r = serverResult;
  const localFromServer =
    r &&
    computeMinutes(
      r.intermediate.H_D_month,
      modelParams.kSkin,
      modelParams.fCover,
      modelParams.kMinutes,
    );

  return (
    <div className="absolute bottom-4 left-84 z-20 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl p-4 w-72 backdrop-blur">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-amber-400">Location Details</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <Row label="Latitude" value={lat.toFixed(3) + "°"} />
      <Row label="Longitude" value={lon.toFixed(3) + "°"} />

      {loading && <p className="text-xs text-gray-500 mt-2">Loading...</p>}

      {r && (
        <div className="mt-3 border-t border-gray-700 pt-2 flex flex-col gap-1">
          <Row
            label="H_D_month"
            value={r.intermediate.H_D_month.toFixed(1) + " J/m\u00b2/day"}
          />
          <div className="mt-2 border-t border-gray-700 pt-2">
            {r.outputs.is_infinite ? (
              <p className="text-sm text-gray-400 font-semibold">
                Insufficient UV
              </p>
            ) : (
              <Row
                label="Minutes required"
                value={r.outputs.minutes_required?.toFixed(1) + " min" || "—"}
              />
            )}
          </div>
          {localFromServer && !localFromServer.isInfinite && r.outputs.minutes_required && (
            <div className="text-[10px] text-gray-600 mt-1">
              Client check: {localFromServer.minutes?.toFixed(1)} min
              {Math.abs((localFromServer.minutes! - r.outputs.minutes_required) / r.outputs.minutes_required) < 0.01
                ? " ✓"
                : " (mismatch)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
