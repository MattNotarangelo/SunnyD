import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { LoadingProgress } from "./components/LoadingProgress";
import { MapView, type FocusTarget } from "./components/MapView";
import { SearchBox } from "./components/SearchBox";
import { useAppState } from "./hooks/useAppState";
import { useMethodology } from "./hooks/useMethodology";
import { MonthStepper } from "./components/MonthStepper";
import { CompactLegend } from "./components/CompactLegend";
import { setColorPalette } from "./model/colorScale";
import { loadMonth, monthReady, prefetchAllMonths } from "./model/gridData";
import type { ModelParams } from "./types";

interface ClickState {
  lat: number;
  lon: number;
  label?: string | null;
}

const SEEN_POINT_KEY = "sunnyd_seen_point";

function readSeenPoint(): boolean {
  try {
    return localStorage.getItem(SEEN_POINT_KEY) === "1";
  } catch {
    return false;
  }
}

const Tooltip = lazy(() =>
  import("./components/Tooltip").then((m) => ({ default: m.Tooltip })),
);

const AboutModal = lazy(() =>
  import("./components/AboutModal").then((m) => ({ default: m.AboutModal })),
);

export default function App() {
  const { methodology } = useMethodology();
  const state = useAppState();
  const [click, setClickState] = useState<ClickState | null>(() =>
    state.selLat !== null && state.selLon !== null
      ? { lat: state.selLat, lon: state.selLon }
      : null,
  );
  // Center on a URL-shared point unless the URL hash already pins the viewport
  const [focus, setFocus] = useState<FocusTarget | null>(() =>
    state.selLat !== null && state.selLon !== null && !window.location.hash.includes("map=")
      ? { lat: state.selLat, lon: state.selLon, zoom: 4 }
      : null,
  );

  // First-visit hint until the visitor has looked at a point once
  const [seenPoint, setSeenPoint] = useState(() => readSeenPoint() || state.selLat !== null);
  const setClick = (info: ClickState | null) => {
    if (info && !seenPoint) {
      setSeenPoint(true);
      try {
        localStorage.setItem(SEEN_POINT_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setClickState(info);
    state.setSelected(info?.lat ?? null, info?.lon ?? null);
  };
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const onSheetHeight = useCallback((px: number) => setSheetHeight(px), []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [ready, setReady] = useState(monthReady(state.month));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load current month's grids, then background-prefetch the rest
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoadError(null);
      if (monthReady(state.month)) {
        setReady(true);
        prefetchAllMonths();
        return;
      }

      setReady(false);
      try {
        await loadMonth(state.month);
        if (cancelled) return;
        setReady(true);
        prefetchAllMonths();
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load data");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.month, retryCount]);

  const modelParams: ModelParams = useMemo(
    () => {
    // Sync palette module state synchronously before render reads it
    setColorPalette(state.colorblindMode ? "colorblind" : "default");
    return {
      skinType: state.skinType,
      fCover: state.coverage,
      kSkin: methodology.fitzpatrick_table[String(state.skinType)] ?? 1,
      kMinutes: methodology.constants.K_minutes,
      encodingScale: methodology.encoding.scale,
      weatherAdjusted: state.coveragePreset === "weather_adjusted",
      month: state.month,
      tempEncodingScale: methodology.encoding.temp_encoding_scale,
      tempOffset: methodology.encoding.temp_offset,
      colorPalette: state.colorblindMode ? "colorblind" : "default",
    };},
    [methodology, state.month, state.coverage, state.coveragePreset, state.skinType, state.colorblindMode],
  );

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 p-6" role="alert">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-white">Couldn&rsquo;t load the sun data</p>
          <p className="text-sm mt-2 text-gray-300">
            SunnyD needs to download this month&rsquo;s climate data. Check your connection and try again.
          </p>
          <p className="text-xs mt-2 text-gray-400">{loadError}</p>
          <button
            onClick={() => {
              setLoadError(null);
              setReady(false);
              setRetryCount((c) => c + 1);
            }}
            className="mt-4 min-h-11 px-4 py-2 bg-amber-500 text-gray-900 rounded hover:bg-amber-400 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-300 text-sm mt-3" role="status">Loading sun data&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex relative">
      <LoadingProgress />
      {/* Top controls: settings (small screens) + search; the map's geolocate sits to the right */}
      <div className="fixed top-3 left-3 right-[4.25rem] z-20 flex gap-2 md:left-[21.5rem] md:right-auto md:w-72">
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Settings"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-gray-700 bg-gray-900/95 text-amber-400 shadow-lg md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <SearchBox
          onSelect={(r) => {
            setClick({ lat: r.lat, lon: r.lon, label: r.label });
            setFocus({ lat: r.lat, lon: r.lon, zoom: 5 });
          }}
        />
      </div>

      {/* Small screens: month and map key live on the map, not only in the drawer */}
      <div className="fixed top-[4.25rem] left-3 right-3 z-10 flex items-stretch gap-2 md:hidden">
        <MonthStepper month={state.month} onChange={state.setMonth} />
        <CompactLegend colorblindMode={state.colorblindMode} />
      </div>

      <ControlPanel
        methodology={methodology}
        month={state.month}
        skinType={state.skinType}
        coverage={state.coverage}
        coveragePreset={state.coveragePreset}
        colorblindMode={state.colorblindMode}
        setMonth={state.setMonth}
        setSkinType={state.setSkinType}
        setCoverage={state.setCoverage}
        setColorblindMode={state.setColorblindMode}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onAbout={() => setAboutOpen(true)}
      />
      <MapView
        month={state.month}
        modelParams={modelParams}
        onMapClick={(info) => setClick(info)}
        focus={focus}
        selected={click}
        bottomInset={sheetHeight}
      />
      {!click && !seenPoint && (
        <div className="pointer-events-none fixed inset-x-4 bottom-20 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl border border-gray-700 bg-gray-900/95 px-4 py-2.5 text-center shadow-lg md:absolute md:bottom-8 md:left-80 md:right-0">
          <p className="text-sm font-semibold text-amber-400 md:hidden">SunnyD: how long in the sun for your daily vitamin D?</p>
          <p className="text-sm text-gray-200">Tap anywhere on the map, or search a place, to see your number.</p>
        </div>
      )}
      {click && (
        <Suspense fallback={null}>
          <Tooltip
            lat={click.lat}
            lon={click.lon}
            label={click.label}
            month={state.month}
            modelParams={modelParams}
            coveragePreset={state.coveragePreset}
            skinTypeChosen={state.skinTypeChosen}
            onSheetHeight={onSheetHeight}
            onSelectMonth={state.setMonth}
            onClose={() => setClick(null)}
          />
        </Suspense>
      )}

      {/* Buy Me a Coffee */}
      <a
        href="https://www.buymeacoffee.com/mattnotarangelo"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-10 md:left-[21.5rem] ${click ? "hidden" : ""}`}
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me A Coffee"
          className="h-[40px] w-auto rounded-lg shadow-lg hover:opacity-90 transition-opacity"
        />
      </a>

      {aboutOpen && (
        <Suspense fallback={null}>
          <AboutModal onClose={() => setAboutOpen(false)} modelVersion={methodology.model_version} />
        </Suspense>
      )}
    </div>
  );
}
