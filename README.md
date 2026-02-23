# SunnyD — Global Vitamin D Sun Exposure Estimator

Estimates how many minutes of midday sun are required to synthesise a target
daily vitamin D intake, by location, month, skin type, and skin exposure.

> **This is an EDUCATIONAL MODEL.**
> It is **not** medical advice.
> It does **not** diagnose vitamin D deficiency.

## Architecture

The backend serves **numeric UV dose data** (`H_D_month` in J/m²/day) and
**temperature data** (°C) as Brotli-compressed uint16 raster tiles. All
skin-type and coverage calculations are performed client-side so that slider
changes are instant (no tile reload except when the month changes).

A "Weather Adjusted" mode uses monthly temperature climatology to
automatically set skin coverage based on estimated local temperature.

### Endpoints

| Route                                                | Description                             |
| ---------------------------------------------------- | --------------------------------------- |
| `GET /api/health`                                    | Service health check                    |
| `GET /api/methodology`                               | All model equations, constants, presets |
| `GET /api/estimate?lat&lon&month&skin_type&coverage` | Point estimate (for tooltip validation) |
| `GET /api/base_tiles/{z}/{x}/{y}.bin?month=`         | Brotli uint16 UV base tile              |
| `GET /api/temp_tiles/{z}/{x}/{y}.bin?month=`         | Brotli uint16 temperature tile          |

### Tile encoding

Each pixel is a little-endian uint16, served with `Content-Encoding: br`
(Brotli). The browser decompresses transparently; JavaScript reads a raw
`Uint16Array`.

```
encoded = round((value + offset) * scale)
0xFFFF = no-data / NaN
```

| Tile type   | Scale | Offset | Encoded range |
| ----------- | ----- | ------ | ------------- |
| UV dose     | 3     | 0      | 0 – 60,000    |
| Temperature | 100   | 50     | 0 – 11,000    |

Frontend decodes: `value = uint16_value / scale - offset`

## Data sources

### UV dose

**TEMIS (KNMI) Vitamin-D-weighted UV Dose** — clear-sky climatology
(2004-2020 monthly averages, data version 2.0), exported 21 Feb 2026.

Download: <https://www.temis.nl/uvradiation/v2.0/nc/clim/uvdvcclim_world.nc>

> Van Geffen, J., Van Weele, M., Allaart, M. and Van der A, R.: 2017,
> TEMIS UV index and UV dose operational data products, version 2.
> Dataset. Royal Netherlands Meteorological Institute (KNMI).
> [doi.org/10.21944/temis-uv-oper-v2](https://doi.org/10.21944/temis-uv-oper-v2)

1. Download the daily climatology NetCDF (`uvdvcclim_world.nc`) from the link above.
2. Run `data.ipynb` to aggregate daily data into monthly means.
3. The output `uvdvcclim_world_monthly.nc` must be placed in the repository root.

### Temperature

**ERA5 monthly averaged data on single levels from 1940 to present** —
0.25° x 0.25° global (land + ocean) 2m air temperature reanalysis from the
Copernicus Climate Data Store. Years used: 2016-2025 (10-year climatology).

Download: <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means>

> Hersbach, H., Bell, B., Berrisford, P., Biavati, G., Horányi, A.,
> Muñoz Sabater, J., Nicolas, J., Peubey, C., Radu, R., Rozum, I.,
> Schepers, D., Simmons, A., Soci, C., Dee, D., Thépaut, J-N. (2023):
> ERA5 monthly averaged data on single levels from 1940 to present.
> Copernicus Climate Change Service (C3S) Climate Data Store (CDS).
> [doi:10.24381/cds.f17050d7](https://doi.org/10.24381/cds.f17050d7)

1. Register (free) at [cds.climate.copernicus.eu](https://cds.climate.copernicus.eu/)
2. Download "ERA5 monthly averaged data on single levels" → Product type:
   Monthly averaged reanalysis → Variable: 2m temperature → Years: 2016-2025
   → All months → Format: NetCDF
3. Place the file in the repository root
4. Run `python scripts/build_temperature_nc.py` to compute the 12-month
   climatology as `temperature_monthly.nc`

The dataset covers both land and ocean. The frontend defaults to 25% skin
coverage for any remaining NaN pixels at grid edges.

## Setup

### Prerequisites

- Python 3.12+
- Node.js 22+
- The UV monthly NetCDF file (see above)
- Optionally, the temperature NetCDF for weather-adjusted mode

### Environment variables

| Variable           | Default               | Description                       |
| ------------------ | --------------------- | --------------------------------- |
| `SUNNYD_DATA_DIR`  | Repository root       | Directory containing NetCDF files |
| `SUNNYD_CACHE_DIR` | `backend/data_cache/` | Directory for tile cache          |

### Local development

```bash
# Backend
pip install -r requirements.txt
make dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

The API will be available at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.
Frontend dev server at `http://localhost:3000`.

### Docker

```bash
make docker-up
```

The frontend is served at `http://localhost:3000` with nginx proxying
`/api/` requests to the backend.

### Running tests

```bash
make test
```

### Linting

```bash
make lint          # backend (ruff)
make lint-frontend # frontend (tsc)
make format        # auto-format backend
```

## Model

### Equation

```
hd_kj   = H_D_month / 1000
minutes = (K_minutes * k_skin) / (hd_kj * f_cover)
```

Where `K_minutes = 20.2` is the dose-time constant.

If `H_D_month <= 0` or `f_cover <= 0`, the result is **Infinity** (insufficient UV).

### Inputs

| Parameter | Description                        |
| --------- | ---------------------------------- |
| `f_cover` | Fraction of skin exposed (0-1)     |
| `k_skin`  | Fitzpatrick multiplier (see below) |

### Fitzpatrick skin-type multipliers

| Type | k_skin |
| ---- | ------ |
| I    | 1.0    |
| II   | 1.2    |
| III  | 1.5    |
| IV   | 2.0    |
| V    | 2.8    |
| VI   | 3.8    |

### Exposure presets

| Preset           | f_cover |
| ---------------- | ------- |
| Winter Clothing  | 0.05    |
| T-shirt + shorts | 0.25    |
| Swimsuit         | 0.85    |
| Weather Adjusted | auto    |

### Weather-adjusted mode

When enabled, skin coverage is computed from the ERA5 monthly mean 2m
temperature using a smoothstep interpolation between 5% (at 0°C) and
25% (at 25°C). Pixels without temperature data default to 25%.
