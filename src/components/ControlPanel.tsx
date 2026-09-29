import { useEffect, useRef, useState } from "react";
import type { MethodologyResponse } from "../types";

const DRAWER_QUERY = "(max-width: 767px)";

/** True when the panel is an off-canvas drawer (small screens). */
function useIsDrawer(): boolean {
  const [isDrawer, setIsDrawer] = useState(() => window.matchMedia(DRAWER_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DRAWER_QUERY);
    const onChange = () => setIsDrawer(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDrawer;
}
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
  colorblindMode: boolean;
  setMonth: (m: number) => void;
  setSkinType: (s: number) => void;
  setCoverage: (cov: number, preset: string | null) => void;
  setColorblindMode: (cb: boolean) => void;
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
  colorblindMode,
  setMonth,
  setSkinType,
  setCoverage,
  setColorblindMode,
  open,
  onClose,
  onAbout,
}: Props) {
  const isDrawer = useIsDrawer();

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose without re-running the focus effect on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Drawer behaves as a modal dialog: focus moves in, stays in, and returns on close
  useEffect(() => {
    if (!isDrawer || !open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [isDrawer, open]);

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
        ref={panelRef}
        // A closed drawer is off-screen: keep it out of the tab order and screen readers
        inert={isDrawer && !open}
        aria-label="Settings"
        role={isDrawer ? "dialog" : undefined}
        aria-modal={isDrawer && open ? true : undefined}
        className={`
          fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw]
          bg-gray-900 text-white flex flex-col overflow-y-auto
          transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:border-r md:border-gray-700
        `}
      >
        <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400">SunnyD</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              How long in the sun for your daily vitamin D?
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close settings"
            className="-m-2 grid h-11 w-11 place-items-center text-gray-400 hover:text-white md:hidden"
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

          <ColorLegend colorblindMode={colorblindMode} />

          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            className={`flex items-center justify-between text-xs px-3 py-1.5 pointer-coarse:min-h-11 rounded w-full transition-colors ${
              colorblindMode
                ? "bg-amber-500 text-gray-900 font-medium"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            }`}
            aria-pressed={colorblindMode}
          >
            <span>Colorblind-friendly colors</span>
            <span aria-hidden="true">{colorblindMode ? "On" : "Off"}</span>
          </button>
        </div>

        <div className="px-4 pb-4">
          <Disclaimer
            text={methodology.disclaimer}
            modelVersion={methodology.model_version}
            onAbout={onAbout}
          />
        </div>
      </div>
    </>
  );
}
