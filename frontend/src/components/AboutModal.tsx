interface Props {
  onClose: () => void;
  modelVersion: string;
}

export function AboutModal({ onClose, modelVersion }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 text-white">
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
            Estimates how many minutes of midday sun are needed to synthesise a target daily vitamin D intake, by
            location, month, skin type, and exposed skin area.
          </p>

          <div>
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
