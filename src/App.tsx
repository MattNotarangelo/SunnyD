import { useEffect, useMemo, useState } from "react";
import { AboutModal } from "./components/AboutModal";
import { ControlPanel } from "./components/ControlPanel";
import { MapView } from "./components/MapView";
import { Tooltip } from "./components/Tooltip";
import { useAppState } from "./hooks/useAppState";
import { useMethodology } from "./hooks/useMethodology";
import { loadMonth, monthReady, prefetchAllMonths } from "./model/gridData";
import type { ModelParams } from "./types";

interface ClickState {
  lat: number;
  lon: number;
}

export default function App() {
  const { methodology } = useMethodology();
  const state = useAppState();
  const [click, setClick] = useState<ClickState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [ready, setReady] = useState(monthReady(state.month));
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load current month's grids, then background-prefetch the rest
  useEffect(() => {
    let cancelled = false;
    setReady(monthReady(state.month));
    setLoadError(null);
    loadMonth(state.month)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          prefetchAllMonths();
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load data");
      });
    return () => { cancelled = true; };
  }, [state.month]);

  const modelParams: ModelParams = useMemo(
    () => ({
      fCover: state.coverage,
      kSkin: methodology.fitzpatrick_table[String(state.skinType)] ?? 1,
      kMinutes: methodology.constants.K_minutes,
      encodingScale: methodology.encoding.scale,
      weatherAdjusted: state.coveragePreset === "weather_adjusted",
      month: state.month,
      tempEncodingScale: methodology.encoding.temp_encoding_scale,
      tempOffset: methodology.encoding.temp_offset,
    }),
    [methodology, state.month, state.coverage, state.coveragePreset, state.skinType],
  );

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-red-400">
        <div className="text-center">
          <p className="text-lg font-semibold">Failed to load data</p>
          <p className="text-sm mt-2 text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-3">Loading SunnyD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex relative">
      {/* Settings toggle — mobile only */}
      <button
        onClick={() => setPanelOpen(true)}
        className="md:hidden fixed top-3 left-3 z-20 bg-gray-900/80 backdrop-blur border border-gray-700 text-amber-400 rounded-lg p-2 shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <ControlPanel
        methodology={methodology}
        month={state.month}
        skinType={state.skinType}
        coverage={state.coverage}
        coveragePreset={state.coveragePreset}
        setMonth={state.setMonth}
        setSkinType={state.setSkinType}
        setCoverage={state.setCoverage}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onAbout={() => setAboutOpen(true)}
      />
      <MapView month={state.month} modelParams={modelParams} onMapClick={(info) => setClick(info)} />
      {click && (
        <Tooltip
          lat={click.lat}
          lon={click.lon}
          month={state.month}
          modelParams={modelParams}
          onClose={() => setClick(null)}
        />
      )}

      {/* Buy Me a Coffee */}
      <a
        href="https://www.buymeacoffee.com/mattnotarangelo"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3 left-3 z-10 md:left-[21.5rem]"
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me A Coffee"
          className="h-[40px] w-auto rounded-lg shadow-lg hover:opacity-90 transition-opacity"
        />
      </a>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} modelVersion={methodology.model_version} />}
    </div>
  );
}
