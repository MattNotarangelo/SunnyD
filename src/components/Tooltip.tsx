import "@fontsource-variable/bricolage-grotesque/wght.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { describeSunnyMonths, getEstimate, getMonthlyProfile, type MonthlyProfileResponse } from "../api/estimate";
import type { ModelParams } from "../types";
import { computeMinutes, type VitDResult } from "../model/vitd";
import { weatherExposure } from "../model/weather";
import { isAchievable } from "../model/thresholds";
import { skinTypeInfo } from "../model/skinTypes";
import { reverseGeocode } from "../api/geocode";
import { MonthChart } from "./MonthChart";

interface Props {
  lat: number;
  lon: number;
  /** Place name from search; absent for map clicks and shared links. */
  label?: string | null;
  month: number;
  modelParams: ModelParams;
  coveragePreset: string | null;
  /** False while the skin type is still the default or a shared link's. */
  skinTypeChosen: boolean;
  /** Reports how much of the map the sheet covers on small screens (0 on desktop). */
  onSheetHeight?: (px: number) => void;
  /** Tapping a month in the chart selects it. */
  onSelectMonth?: (month: number) => void;
  onClose: () => void;
}

const SHEET_QUERY = "(max-width: 767px)";

const EXPOSURE_LABELS: Record<string, string> = {
  weather_adjusted: "weather-adjusted clothing",
  face_hands: "winter clothing",
  tshirt_shorts: "T-shirt and shorts",
  swimsuit: "swimsuit",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-100 tabular-nums">{value}</span>
    </div>
  );
}

function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

/** Rounded, human duration: whole minutes under an hour, nearest 5 min above. */
function durationParts(minutes: number): { value: number; unit: string }[] {
  if (minutes < 60) return [{ value: Math.max(1, Math.round(minutes)), unit: "min" }];
  const total = Math.round(minutes / 5) * 5;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? [{ value: h, unit: "h" }, { value: m, unit: "min" }] : [{ value: h, unit: "h" }];
}

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shortDuration(minutes: number): string {
  return `\u2248 ${durationParts(minutes).map((p) => `${p.value} ${p.unit}`).join(" ")}`;
}

type Answer =
  | { achievable: true; minutes: number }
  | { achievable: false; reason: string };

function toAnswer(result: VitDResult, cover: number): Answer {
  if (cover <= 0) {
    return { achievable: false, reason: "With no skin exposed, the sun can’t make any vitamin D." };
  }
  if (result.isInfinite || result.minutes == null) {
    return { achievable: false, reason: "The midday sun here this month is too weak to make vitamin D." };
  }
  if (!isAchievable(result.minutes)) {
    return {
      achievable: false,
      reason: "It would take more than 4 hours of midday sun per day, longer than the midday window itself.",
    };
  }
  return { achievable: true, minutes: result.minutes };
}

function supplementMessage(label: string) {
  if (label === "the whole year") {
    return "Sun alone probably won’t be enough at any time of year. Consider a vitamin D supplement.";
  }
  return (
    <>
      Sun alone probably won’t be enough in <span className="whitespace-nowrap">{label}</span>. Consider a
      vitamin D supplement in those months.
    </>
  );
}

export function Tooltip({
  lat,
  lon,
  label,
  month,
  modelParams,
  coveragePreset,
  skinTypeChosen,
  onSheetHeight,
  onSelectMonth,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Small screens open as a peek (answer only); the year and details expand in place
  const [expanded, setExpanded] = useState(false);

  // Map clicks, geolocation and shared links arrive without a name: look one up
  const [found, setFound] = useState<{ key: string; name: string | null } | null>(null);
  const pointKey = `${lat}:${lon}`;
  useEffect(() => {
    if (label) return;
    const controller = new AbortController();
    reverseGeocode(lat, lon, controller.signal)
      .then((name) => setFound({ key: pointKey, name }))
      .catch(() => { /* keep showing coordinates */ });
    return () => controller.abort();
  }, [lat, lon, label, pointKey]);
  const placeName = label ?? (found?.key === pointKey ? found.name : null);

  // Share the current view (the URL already carries place, month and settings)
  const [shared, setShared] = useState(false);
  useEffect(() => {
    if (!shared) return;
    const t = window.setTimeout(() => setShared(false), 2000);
    return () => window.clearTimeout(t);
  }, [shared]);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: placeName ? `SunnyD: ${placeName}` : "SunnyD", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      /* dismissed share sheet or blocked clipboard: nothing to report */
    }
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onSheetHeight) return;
    const mq = window.matchMedia(SHEET_QUERY);
    const report = () => onSheetHeight(mq.matches ? el.offsetHeight : 0);
    const ro = new ResizeObserver(report);
    ro.observe(el);
    mq.addEventListener("change", report);
    report();
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", report);
      onSheetHeight(0);
    };
  }, [onSheetHeight]);
  const [profile, setProfile] = useState<MonthlyProfileResponse | null>(null);
  const [profileKey, setProfileKey] = useState("");
  const [profileErrorKey, setProfileErrorKey] = useState("");
  const [profileAttempt, setProfileAttempt] = useState(0);

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
    getMonthlyProfile({
      lat,
      lon,
      skinType,
      coverage: coverageForCalc,
      weatherAdjusted: modelParams.weatherAdjusted,
    })
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setProfileKey(key);
        }
      })
      .catch(() => {
        // The answer above still stands; only the year view is missing
        if (!cancelled) setProfileErrorKey(key);
      });
    return () => { cancelled = true; };
  }, [lat, lon, skinType, coverageForCalc, modelParams.weatherAdjusted, requestKey, profileAttempt]);

  const serverTemp = r.intermediate.temperature ?? null;
  const displayCover =
    modelParams.weatherAdjusted && serverTemp !== null
      ? weatherExposure(serverTemp)
      : r.constants_used.f_cover ?? coverageForCalc;

  const result = computeMinutes(
    r.intermediate.H_D_month,
    r.constants_used.k_skin,
    displayCover,
    r.constants_used.K_minutes,
  );
  const answer = toAnswer(result, displayCover);
  const coords = formatCoords(lat, lon);

  const monthName = new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });
  const hasProfile = profileKey === requestKey && profile !== null;
  const profileFailed = !hasProfile && profileErrorKey === requestKey;
  const sunny = hasProfile ? describeSunnyMonths(profile.monthly) : null;
  const skin = skinTypeInfo(skinType);
  const exposure =
    (coveragePreset && EXPOSURE_LABELS[coveragePreset]) ?? `${Math.round(modelParams.fCover * 100)}% skin exposed`;

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-gray-700 bg-gray-900 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.35)] md:absolute md:inset-x-auto md:bottom-4 md:max-h-[calc(100dvh-5rem)] md:left-[21rem] md:w-80 md:rounded-lg md:border md:bg-gray-900/95 md:p-4 md:shadow-xl"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? "Show less" : "Show the year and details"}
        className="mx-auto -mt-1 grid h-11 w-24 place-items-center md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-gray-600" />
      </button>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-amber-400 break-words">{placeName ?? coords}</h2>
          {placeName && <p className="text-xs text-gray-400 mt-0.5">{coords}</p>}
        </div>
        <button
          type="button"
          onClick={share}
          className="-my-3 ml-auto flex h-11 shrink-0 items-center gap-1.5 px-2 text-xs text-gray-300 hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
          </svg>
          <span aria-live="polite">{shared ? "Link copied" : "Share"}</span>
        </button>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-m-3 grid h-11 w-11 shrink-0 place-items-center text-xl leading-none text-gray-400 hover:text-white"
        >
          &times;
        </button>
      </div>

      <div className="mt-4" aria-live="polite">
        <p className="text-xs text-gray-400">Midday sun needed</p>
        {answer.achievable ? (
          <>
            <p className="mt-1.5 font-display text-3xl font-semibold leading-tight tracking-tight text-white lining-nums tabular-nums">
              <span className="mr-1 font-normal text-gray-400">{answer.minutes < 1 ? "<" : "\u2248"}</span>
              {durationParts(answer.minutes).map((part, i) => (
                <span key={i} className={i > 0 ? "ml-1.5" : undefined}>
                  {part.value}
                  <span className="ml-0.5 text-xl font-medium tracking-normal text-gray-300">{part.unit}</span>
                </span>
              ))}
            </p>
            <p className="mt-2.5 text-sm leading-snug text-pretty text-gray-300">
              per day in {monthName}, to make about 1,000 IU of vitamin D.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 font-display text-3xl font-semibold leading-tight tracking-tight text-white">
              Not achievable
            </p>
            <p className="mt-2 text-sm leading-snug text-pretty text-gray-300">
              {monthName}: {answer.reason.charAt(0).toLowerCase() + answer.reason.slice(1)}
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-400">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/25"
          style={{ backgroundColor: skin.tone }}
          aria-hidden="true"
        />
        <span>
          {skinTypeChosen ? "For" : "Assuming"} skin type {skin.numeral} &middot; {exposure}
        </span>
      </div>

      {hasProfile && (
        <div className={`mt-5 ${expanded ? "" : "hidden"} md:block`}>
          <MonthChart monthly={profile.monthly} currentMonth={month} onSelectMonth={onSelectMonth} />
          {sunny && (
            <p className="mt-3 text-sm leading-snug text-gray-200">
              Sun is enough in {sunny.label === "the whole year" ? "every month" : <span className="whitespace-nowrap">{sunny.label}</span>}
              <span className="text-gray-400"> &middot; best {shortDuration(sunny.best.minutes)} in {FULL_MONTH_NAMES[sunny.best.month - 1]}</span>
            </p>
          )}
        </div>
      )}
      {profileFailed && (
        <div className={`mt-5 ${expanded ? "" : "hidden"} md:block`}>
          <p className="text-sm text-gray-300">
            Couldn&rsquo;t load the month-by-month view. Check your connection.{" "}
            <button
              type="button"
              onClick={() => {
                setProfileErrorKey("");
                setProfileAttempt((n) => n + 1);
              }}
              className="-my-2 py-2 text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              Try again
            </button>
          </p>
        </div>
      )}
      {hasProfile && profile.supplement.label && (
        <p className="mt-3 text-sm leading-snug text-pretty text-amber-300">
          {supplementMessage(profile.supplement.label)}
        </p>
      )}

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 rounded-md border border-gray-700 text-sm text-gray-200 md:hidden"
        >
          See month by month
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <details className={`group mt-4 border-t border-gray-700/70 pt-3 ${expanded ? "" : "hidden"} md:block`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs text-gray-400 md:min-h-0 hover:text-gray-200 [&::-webkit-details-marker]:hidden">
          How this was calculated
          <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </summary>
        <div className="mt-2 flex flex-col gap-1">
          <Row
            label="Vitamin D UV dose"
            value={(r.intermediate.H_D_month / 1000).toFixed(2) + " kJ/m\u00b2 a day"}
          />
          {serverTemp !== null && (
            <Row
              label="Typical daytime high"
              value={"\u2248 " + (serverTemp + 5).toFixed(0) + " \u00b0C"} // monthly mean runs ~5°C below midday highs
            />
          )}
          <Row
            label={modelParams.weatherAdjusted && serverTemp !== null ? "Skin exposed (estimated)" : "Skin exposed"}
            value={(displayCover * 100).toFixed(0) + "%"}
          />
          <Row label="Skin type multiplier" value={"\u00d7" + r.constants_used.k_skin} />
        </div>
      </details>
    </div>
  );
}
