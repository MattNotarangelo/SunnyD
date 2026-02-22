# SunnyD — Global Vitamin D Sun Exposure Estimator

Estimates how many minutes of midday sun are required to synthesise a target
daily vitamin D intake, by location, month, skin type, and skin exposure.

> **This is an EDUCATIONAL MODEL.**
> It is **not** medical advice.
> It does **not** diagnose vitamin D deficiency.

## Architecture

The backend serves **only numeric UV dose data** (`H_D_month` in J/m²/day) as
RGB-encoded raster tiles. All skin-type, IU-target, and coverage calculations
are performed client-side so that slider changes are instant (no tile reload
except when the month changes).

### Endpoints

| Route                                                   | Description                             |
| ------------------------------------------------------- | --------------------------------------- |
| `GET /api/health`                                       | Service health check                    |
| `GET /api/methodology`                                  | All model equations, constants, presets |
| `GET /api/estimate?lat&lon&month&skin_type&iu&coverage` | Point estimate (for tooltip validation) |
| `GET /api/base_tiles/{z}/{x}/{y}.png?month=`            | Numeric RGB-encoded base tile           |

### Tile encoding

Each pixel packs `H_D_month` into 24-bit RGB:

```
encoded = round(H_D_month × 100)
R = (encoded >> 16) & 0xFF
G = (encoded >>  8) & 0xFF
B =  encoded        & 0xFF
A = 255 (valid) | 0 (no data)
```

Frontend decodes: `H_D_month = (R × 65536 + G × 256 + B) / 100.0`

## Data source

**TEMIS (KNMI) Vitamin-D-weighted UV Dose** — clear-sky product.

1. Download the daily climatology NetCDF (`uvdvcclim_world.nc`) from TEMIS.
2. Run `data.ipynb` to aggregate daily data into monthly means.
3. The output `uvdvcclim_world_monthly.nc` must be placed in the repository root.

If the monthly NetCDF is not present, the app falls back to a synthetic sample
data provider.

## Setup

### Prerequisites

- Python 3.12+
- The monthly NetCDF file (see above)

### Local development

```bash
cd backend
pip install -r requirements.txt
cd ..
make dev
```

The API will be available at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.

### Docker

```bash
make docker-up
```

### Running tests

```bash
make test
```

### Linting

```bash
make lint
make format
```

## Model

### Inputs

| Parameter   | Description                                      |
| ----------- | ------------------------------------------------ |
| `IU_target` | Desired daily vitamin D (IU): 600, 1000, or 2000 |
| `f_cover`   | Fraction of skin exposed (0-1)                   |
| `k_skin`    | Fitzpatrick multiplier (see table below)         |
| `T_window`  | Midday sun window: 120 minutes                   |
| `C_IU`      | Calibration constant: 0.10 IU per (J/m²)         |
| `H_min`     | Minimum dose threshold: 50 J/m²/day              |

### Equations

```
Hdot_D         = H_D_month / T_window
IU_per_min_ref = C_IU × Hdot_D
IU_per_min_user = IU_per_min_ref × f_cover / k_skin
t_minutes      = IU_target / IU_per_min_user
```

If `H_D_month < H_min` or `IU_per_min_user ≤ 0` → result is **Infinity**.

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
| Face + hands     | 0.05    |
| T-shirt + shorts | 0.25    |
| Swimsuit         | 0.85    |
