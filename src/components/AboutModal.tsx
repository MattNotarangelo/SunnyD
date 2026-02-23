interface Props {
  onClose: () => void;
  modelVersion: string;
}

export function AboutModal({ onClose, modelVersion }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 text-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white text-lg leading-none"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-amber-400 mb-1">SunnyD</h2>
        <p className="text-sm text-gray-400 mb-4">Global Vitamin D Sun Exposure Estimator</p>

        <div className="space-y-3 text-sm text-gray-300">
          <p>
            Estimates how many minutes of midday sun are needed to synthesise a target daily vitamin D (specifically D3) synthesis, by
            location, month, skin type, and exposed skin area.
          </p>

          {/* Model derivation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Model</h3>
            <p className="text-xs text-gray-400 mb-2">
              The human body is treated as a 3D collector of the vitamin-D-weighted UV energy reported by the TEMIS
              satellite.
            </p>

            <h4 className="text-xs font-semibold text-gray-300 mt-2 mb-1">Variables</h4>
            <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
              <li>
                <span className="text-gray-300 font-mono">H_D</span> — Daily Vitamin-D UV dose from TEMIS (kJ/m²)
              </li>
              <li>
                <span className="text-gray-300 font-mono">BSA</span> — Total body surface area (≈ 1.8 m²)
              </li>
              <li>
                <span className="text-gray-300 font-mono">f_exposed</span> — Fraction of skin exposed (0-1)
              </li>
              <li>
                <span className="text-gray-300 font-mono">C_geo</span> — Geometry factor = 0.33 (only ≈⅓ of exposed skin
                faces the sun)
              </li>
              <li>
                <span className="text-gray-300 font-mono">T_peak</span> — Solar window = 240 min (dose delivered over ~4
                h midday)
              </li>
              <li>
                <span className="text-gray-300 font-mono">E_target</span> — 0.05 kJ (energy needed for 1,000 IU, based
                on 0.25 MED over 25% BSA)
              </li>
              <li>
                <span className="text-gray-300 font-mono">M_fitz</span> — Fitzpatrick skin-type multiplier
              </li>
            </ul>

            <h4 className="text-xs font-semibold text-gray-300 mt-3 mb-1">Energy rate hitting the skin (kJ/min)</h4>
            <div className="bg-gray-800 rounded px-3 py-2 text-xs font-mono text-amber-300/90 overflow-x-auto">
              Rate = (H_D / T_peak) × (BSA × f_exposed × C_geo)
            </div>

            <h4 className="text-xs font-semibold text-gray-300 mt-2 mb-1">Time to reach target energy</h4>
            <div className="bg-gray-800 rounded px-3 py-2 text-xs font-mono text-amber-300/90 overflow-x-auto">
              Time (min) = (E_target × M_fitz) / Rate
            </div>

            <h4 className="text-xs font-semibold text-gray-300 mt-2 mb-1">
              Combined formula (with constants substituted)
            </h4>
            <div className="bg-gray-800 rounded px-3 py-2 text-xs font-mono text-amber-300/90 overflow-x-auto">
              Time = (0.05 × 240 × M_fitz) / (H_D × 1.8 × f_exposed × 0.33)
            </div>
          </div>

          {/* Data sources */}
          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Data Sources</h3>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>
                <span className="text-gray-300">UV dose:</span>{" "}
                <a
                  href="https://www.temis.nl/uvradiation/v2.0/nc/clim/uvdvcclim_world.nc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-400 underline"
                >
                  TEMIS (KNMI)
                </a>{" "}
                Vitamin-D-weighted UV dose climatology v2.0 (2004-2020).{" "}
                <a
                  href="https://doi.org/10.21944/temis-uv-oper-v2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-400 underline"
                >
                  doi:10.21944/temis-uv-oper-v2
                </a>
              </li>
              <li>
                <span className="text-gray-300">Temperature:</span>{" "}
                <a
                  href="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-400 underline"
                >
                  ERA5
                </a>{" "}
                monthly averaged reanalysis, 2m temperature, 0.25° (2016-2025).{" "}
                <a
                  href="https://doi.org/10.24381/cds.f17050d7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-400 underline"
                >
                  doi:10.24381/cds.f17050d7
                </a>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-gray-500">
              This is an <strong className="text-gray-400">educational model</strong>. It is not medical advice. It does
              not diagnose vitamin D deficiency.
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Questions? Feel free to contact me at{" "}
            <a href="mailto:matt.notarangelo1@gmail.com" className="text-amber-400/80 hover:text-amber-400 underline">
              matt.notarangelo1@gmail.com
            </a>
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>Model v{modelVersion}</span>
            <a
              href="https://github.com/MattNotarangelo/SunnyD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
