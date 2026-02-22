import type { MethodologyResponse } from "../types";
import { ColorLegend } from "./ColorLegend";
import { Disclaimer } from "./Disclaimer";
import { ExposureSelector } from "./ExposureSelector";
import { MonthSlider } from "./MonthSlider";
import { SkinTypeSelector } from "./SkinTypeSelector";

interface Props {
  methodology: MethodologyResponse;
  month: number;
  skinType: number;
  coverage: number;
  coveragePreset: string | null;
  setMonth: (m: number) => void;
  setSkinType: (s: number) => void;
  setCoverage: (cov: number, preset: string | null) => void;
  open: boolean;
  onClose: () => void;
  onAbout: () => void;
}

export function ControlPanel({
  methodology,
  month,
  skinType,
  coverage,
  coveragePreset,
  setMonth,
  setSkinType,
  setCoverage,
  open,
  onClose,
  onAbout,
}: Props) {
  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw]
          bg-gray-900 text-white flex flex-col overflow-y-auto
          transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:border-r md:border-gray-700
        `}
      >
        <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold text-amber-400">SunnyD</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Vitamin D Sun Exposure Estimator
              </p>
            </div>
            <button
              onClick={onAbout}
              className="text-gray-500 hover:text-amber-400 transition-colors p-1 self-start mt-0.5"
              title="About"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-4 py-4 flex flex-col gap-5">
          <MonthSlider month={month} onChange={setMonth} />
          <SkinTypeSelector
            skinType={skinType}
            fitzpatrick={methodology.fitzpatrick_table}
            onChange={setSkinType}
          />
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
    </>
  );
}
