import { useEffect, useMemo, useState } from "react";
import { getEstimate, getSupplement, type SupplementResponse } from "../api/estimate";
import type { ModelParams } from "../types";
import { computeMinutes } from "../model/vitd";
import { weatherExposure } from "../model/weather";

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
  const [supplement, setSupplement] = useState<SupplementResponse | null>(null);
  const [supplementKey, setSupplementKey] = useState("");

  const coverageForCalc = modelParams.weatherAdjusted ? 0.25 : modelParams.fCover;
  const skinType = modelParams.skinType;

  const r = useMemo(
    () => getEstimate({ lat, lon, month, skinType, coverage: coverageForCalc }),
    [lat, lon, month, skinType, coverageForCalc],
  );
  const requestKey = `${lat}:${lon}:${skinType}:${coverageForCalc}:${modelParams.weatherAdjusted}`;

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    getSupplement({
      lat,
      lon,
      skinType,
      coverage: coverageForCalc,
      weatherAdjusted: modelParams.weatherAdjusted,
    })
      .then((s) => {
        if (!cancelled) {
          setSupplement(s);
          setSupplementKey(key);
        }
      })
      .catch(() => { /* supplement is optional; silently degrade */ });
    return () => { cancelled = true; };
  }, [lat, lon, skinType, coverageForCalc, modelParams.weatherAdjusted, requestKey]);

  const serverTemp = r.intermediate.temperature ?? null;
  const displayCover =
    modelParams.weatherAdjusted && serverTemp !== null
      ? weatherExposure(serverTemp)
      : r.constants_used.f_cover ?? coverageForCalc;

  const adjustedMinutes =
    modelParams.weatherAdjusted && serverTemp !== null
      ? computeMinutes(
          r.intermediate.H_D_month,
          r.constants_used.k_skin,
          displayCover,
          r.constants_used.K_minutes,
        )
      : null;

  const localFromServer = computeMinutes(
    r.intermediate.H_D_month,
    r.constants_used.k_skin,
    displayCover,
    r.constants_used.K_minutes,
  );

  return (
    <div className="fixed bottom-4 left-4 right-4 z-20 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl p-4 backdrop-blur md:absolute md:left-[21rem] md:right-auto md:w-72">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-amber-400">Location Details</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <Row label="Latitude" value={lat.toFixed(3) + "\u00b0"} />
      <Row label="Longitude" value={lon.toFixed(3) + "\u00b0"} />

      <div className="mt-3 border-t border-gray-700 pt-2 flex flex-col gap-1">
        <Row
          label="Average UVB dose"
          value={r.intermediate.H_D_month.toFixed(1) + " J/m\u00b2/day"}
        />
        {r.intermediate.temperature !== null && (
          <Row
            label="Average maximum temp"
            value={r.intermediate.temperature.toFixed(1) + " \u00b0C"}
          />
        )}
        {modelParams.weatherAdjusted && r.intermediate.temperature !== null && (
          <Row
            label="Estimated skin exposure"
            value={(displayCover * 100).toFixed(0) + "%"}
          />
        )}
        <div className="mt-2 border-t border-gray-700 pt-2">
          {(adjustedMinutes ?? localFromServer).isInfinite || displayCover <= 0 ? (
            <p className="text-sm text-gray-400 font-semibold">
              Insufficient UV
            </p>
          ) : (
            <Row
              label="Exposure time required"
              value={
                adjustedMinutes
                  ? (adjustedMinutes.minutes?.toFixed(1) ?? "\u2014") + " min"
                  : r.outputs.minutes_required != null
                    ? r.outputs.minutes_required.toFixed(1) + " min"
                    : "\u2014"
              }
            />
          )}
        </div>
        {supplementKey === requestKey && supplement?.label && (
          <p className="text-xs text-amber-300/80 mt-2">
            Consider supplemental Vitamin D during {supplement.label}
          </p>
        )}
      </div>
    </div>
  );
}
