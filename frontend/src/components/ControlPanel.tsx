import type { MethodologyResponse } from "../types";
import { ColorLegend } from "./ColorLegend";
import { Disclaimer } from "./Disclaimer";
import { ExposureSelector } from "./ExposureSelector";
import { IUSelector } from "./IUSelector";
import { MonthSlider } from "./MonthSlider";
import { SkinTypeSelector } from "./SkinTypeSelector";

interface Props {
  methodology: MethodologyResponse;
  month: number;
  skinType: number;
  iu: number;
  coverage: number;
  coveragePreset: string | null;
  setMonth: (m: number) => void;
  setSkinType: (s: number) => void;
  setIU: (iu: number) => void;
  setCoverage: (cov: number, preset: string | null) => void;
}

export function ControlPanel({
  methodology,
  month,
  skinType,
  iu,
  coverage,
  coveragePreset,
  setMonth,
  setSkinType,
  setIU,
  setCoverage,
}: Props) {
  return (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-full overflow-y-auto border-r border-gray-700">
      <div className="px-4 py-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-amber-400">SunnyD</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Vitamin D Sun Exposure Estimator
        </p>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-5">
        <MonthSlider month={month} onChange={setMonth} />
        <SkinTypeSelector
          skinType={skinType}
          fitzpatrick={methodology.fitzpatrick_table}
          onChange={setSkinType}
        />
        <IUSelector iu={iu} onChange={setIU} />
        <ExposureSelector
          coverage={coverage}
          coveragePreset={coveragePreset}
          presets={methodology.exposure_presets}
          onChange={setCoverage}
        />

        <div className="opacity-50 cursor-not-allowed">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" disabled className="accent-gray-500" />
            Cloud-adjusted (coming soon)
          </label>
        </div>

        <ColorLegend />
      </div>

      <div className="px-4 pb-4">
        <Disclaimer
          text={methodology.disclaimer}
          modelVersion={methodology.model_version}
        />
      </div>
    </div>
  );
}
