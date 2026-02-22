import { useEffect, useRef, useState } from "react";
import { fetchEstimate, fetchSupplement, type SupplementResponse } from "../api/estimate";
import type { EstimateResponse, ModelParams } from "../types";
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
  const [serverResult, setServerResult] = useState<EstimateResponse | null>(null);
  const [supplement, setSupplement] = useState<SupplementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const coverageForFetch = modelParams.weatherAdjusted ? 0.25 : modelParams.fCover;

  const skinType = (() => {
    for (const [k, v] of Object.entries({ 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 2.8, 6: 3.8 })) {
      if (v === modelParams.kSkin) return Number(k);
    }
    return 2;
  })();

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setServerResult(null);
    setSupplement(null);
    setError(null);

    const estimateReq = fetchEstimate({
      lat, lon, month, skinType, coverage: coverageForFetch,
    });
    const supplementReq = fetchSupplement({
      lat, lon, skinType, coverage: coverageForFetch,
      weatherAdjusted: modelParams.weatherAdjusted,
    });

    Promise.all([estimateReq, supplementReq])
      .then(([est, supp]) => {
        if (id === requestId.current) {
          setServerResult(est);
          setSupplement(supp);
        }
      })
      .catch((err) => {
        if (id === requestId.current) setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [lat, lon, month, skinType, coverageForFetch, modelParams.weatherAdjusted]);

  const r = serverResult;

  const serverTemp = r?.intermediate.temperature ?? null;
  const displayCover = modelParams.weatherAdjusted && serverTemp !== null
    ? weatherExposure(serverTemp)
    : r?.constants_used.f_cover ?? coverageForFetch;

  // In weather-adjusted mode, recompute minutes with the actual weather
  // exposure (the server used the 0.25 placeholder, not the real value).
  const adjustedMinutes =
    r && modelParams.weatherAdjusted && serverTemp !== null
      ? computeMinutes(
          r.intermediate.H_D_month,
          r.constants_used.k_skin,
          displayCover,
          r.constants_used.K_minutes,
        )
      : null;

  const localFromServer =
    r &&
    computeMinutes(
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

      {loading && <p className="text-xs text-gray-500 mt-2">Loading...</p>}

      {error && (
        <p className="text-xs text-red-400 mt-2">Failed to load estimate</p>
      )}

      {r && (
        <div className="mt-3 border-t border-gray-700 pt-2 flex flex-col gap-1">
          <Row
            label="H_D_month"
            value={r.intermediate.H_D_month.toFixed(1) + " J/m\u00b2/day"}
          />
          {r.intermediate.temperature !== null && (
            <Row
              label="Temperature"
              value={r.intermediate.temperature.toFixed(1) + " \u00b0C"}
            />
          )}
          {modelParams.weatherAdjusted && r.intermediate.temperature !== null && (
            <Row
              label="Weather exposure"
              value={(displayCover * 100).toFixed(0) + "%"}
            />
          )}
          <div className="mt-2 border-t border-gray-700 pt-2">
            {(adjustedMinutes ?? localFromServer)?.isInfinite || (displayCover <= 0) ? (
              <p className="text-sm text-gray-400 font-semibold">
                Insufficient UV
              </p>
            ) : (
              <Row
                label="Minutes required"
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
          {supplement?.label && (
            <p className="text-xs text-amber-300/80 mt-2">
              Consider supplemental Vitamin D during {supplement.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
