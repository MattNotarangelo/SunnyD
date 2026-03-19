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
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Track */}
      <div className="h-1 bg-gray-800/60">
        {/* Fill */}
        <div
          className="h-full bg-amber-400 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Label */}
      <div className="flex justify-center mt-1">
        <span className="text-[11px] text-gray-400 bg-gray-900/70 backdrop-blur px-2 py-0.5 rounded">
          Loading month data... {loaded}/{total}
        </span>
      </div>
    </div>
  );
}
