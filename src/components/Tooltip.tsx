import { useEffect, useMemo, useState } from "react";
import { getEstimate, getMonthlyProfile, type MonthlyProfileResponse } from "../api/estimate";
import type { ModelParams } from "../types";
import { computeMinutes } from "../model/vitd";
import { weatherExposure } from "../model/weather";
import { MonthChart } from "./MonthChart";

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
  const [profile, setProfile] = useState<MonthlyProfileResponse | null>(null);
  const [profileKey, setProfileKey] = useState("");

  const coverageForCalc = modelParams.weatherAdjusted ? 0.25 : modelParams.fCover;
  const skinType = modelParams.skinType;
  const cloudAdjusted = modelParams.skyMode === "cloud";

  const r = useMemo(
    () => getEstimate({ lat, lon, month, skinType, coverage: coverageForCalc, cloudAdjusted }),
    [lat, lon, month, skinType, coverageForCalc, cloudAdjusted],
  );
  const requestKey = `${lat}:${lon}:${skinType}:${coverageForCalc}:${modelParams.weatherAdjusted}:${cloudAdjusted}`;

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    getMonthlyProfile({
      lat,
      lon,
      skinType,
      coverage: coverageForCalc,
      weatherAdjusted: modelParams.weatherAdjusted,
      cloudAdjusted,
    })
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setProfileKey(key);
        }
      })
      .catch(() => { /* the profile is optional; silently degrade */ });
    return () => { cancelled = true; };
  }, [lat, lon, skinType, coverageForCalc, modelParams.weatherAdjusted, cloudAdjusted, requestKey]);

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
          label={cloudAdjusted ? "Average UVB dose (cloud-adj.)" : "Average UVB dose"}
          value={r.intermediate.H_D_month.toFixed(1) + " J/m\u00b2/day"}
        />
        {r.intermediate.temperature !== null && (
          <Row
            label="Average maximum temp"
            value={(r.intermediate.temperature + 5).toFixed(1) + " \u00b0C"} // add 5°C to avoid under-estimating exposure from daily mean
          />
        )}
        {modelParams.weatherAdjusted && r.intermediate.temperature !== null && (
          <Row
            label="Estimated skin exposure"
            value={(displayCover * 100).toFixed(0) + "%"}
          />
        )}
        <div className="mt-2 border-t border-gray-700 pt-2">
          {(() => {
            const result = adjustedMinutes ?? localFromServer;
            const mins = result.minutes;
            if (result.isInfinite || displayCover <= 0 || (mins != null && mins > 360)) {
              return <Row label="Exposure time required" value="Impossible" />;
            }
            return (
              <Row
                label="Exposure time required"
                value={mins != null ? mins.toFixed(1) + " min" : "\u2014"}
              />
            );
          })()}
        </div>
        {profileKey === requestKey && profile && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              Minutes needed by month
            </p>
            <MonthChart monthly={profile.monthly} currentMonth={month} />
          </div>
        )}
        {profileKey === requestKey && profile?.supplement.label && (
          <p className="text-xs text-amber-300/80 mt-2">
            Consider supplemental Vitamin D during {profile.supplement.label}
          </p>
        )}
      </div>
    </div>
  );
}
