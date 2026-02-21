import { useMemo, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { MapView } from "./components/MapView";
import { Tooltip } from "./components/Tooltip";
import { useAppState } from "./hooks/useAppState";
import { useMethodology } from "./hooks/useMethodology";
import type { ModelParams } from "./types";

interface ClickState {
  lat: number;
  lon: number;
}

export default function App() {
  const { methodology, error } = useMethodology();
  const state = useAppState();
  const [click, setClick] = useState<ClickState | null>(null);

  const modelParams: ModelParams | null = useMemo(() => {
    if (!methodology) return null;
    return {
      fCover: state.coverage,
      kSkin: methodology.fitzpatrick_table[String(state.skinType)] ?? 1,
      kMinutes: methodology.constants.K_minutes,
      encodingScale: methodology.encoding.scale,
    };
  }, [methodology, state.coverage, state.skinType]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-red-400">
        <div className="text-center">
          <p className="text-lg font-semibold">Failed to load configuration</p>
          <p className="text-sm mt-2 text-gray-500">{error}</p>
          <p className="text-sm mt-1 text-gray-600">
            Is the backend running on port 8000?
          </p>
        </div>
      </div>
    );
  }

  if (!methodology || !modelParams) {
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
      <ControlPanel
        methodology={methodology}
        month={state.month}
        skinType={state.skinType}
        coverage={state.coverage}
        coveragePreset={state.coveragePreset}
        setMonth={state.setMonth}
        setSkinType={state.setSkinType}
        setCoverage={state.setCoverage}
      />
      <MapView
        month={state.month}
        modelParams={modelParams}
        onMapClick={(info) => setClick(info)}
      />
      {click && (
        <Tooltip
          lat={click.lat}
          lon={click.lon}
          month={state.month}
          modelParams={modelParams}
          onClose={() => setClick(null)}
        />
      )}
    </div>
  );
}
