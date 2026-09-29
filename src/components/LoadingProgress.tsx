import { useEffect, useState } from "react";
import { allMonthsReady, setProgressCallback } from "../model/gridData";

/**
 * Thin progress bar at the top of the screen showing background prefetch status.
 * Fades out once all 24 grids (12 months x 2 layers) are loaded.
 */
export function LoadingProgress() {
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(24);
  const [visible, setVisible] = useState(!allMonthsReady());

  useEffect(() => {
    if (!visible) return;

    setProgressCallback((l, t) => {
      setLoaded(l);
      setTotal(t);
      if (l >= t) {
        // Delay hiding so the user can see the bar reach 100%
        setTimeout(() => setVisible(false), 600);
      }
    });

    return () => {
      setProgressCallback(null);
    };
  }, [visible]);

  if (!visible) return null;

  const pct = total > 0 ? (loaded / total) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none" role="progressbar" aria-label="Loading month data" aria-valuemin={0} aria-valuemax={total} aria-valuenow={loaded}>
      {/* Track */}
      <div className="h-1 bg-gray-800/60">
        {/* Fill */}
        <div
          className="h-full bg-amber-400 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Label */}
      {/* Small screens: the bar alone; a label here would sit on the top controls */}
      <div className="mt-1 hidden justify-center md:flex md:pl-80">
        <span className="rounded bg-gray-900/90 px-2 py-0.5 text-xs text-gray-300">
          Loading month data... {loaded}/{total}
        </span>
      </div>
    </div>
  );
}
