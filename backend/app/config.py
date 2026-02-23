from __future__ import annotations

MODEL_VERSION = "2.0.0"

# --- Model constants ---

K_MINUTES: float = 20.2  # dose-time constant (minutes · J/m² per skin-unit)

# --- Fitzpatrick skin-type multipliers ---

FITZPATRICK: dict[int, float] = {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 2.0,
    5: 2.8,
    6: 3.8,
}

# --- Exposure presets (fraction of body exposed) ---

EXPOSURE_PRESETS: dict[str, float] = {
    "face_hands": 0.05,
    "tshirt_shorts": 0.25,
    "swimsuit": 0.85,
}

# --- Tile encoding ---
# uint16, Brotli-compressed. 0xFFFF = no-data, max valid = 65534.
# UV:   0–20,000 J/m² × 3 → 0–60,000.  Precision: 0.33 J/m²
# Temp: (-50+50)–(60+50) × 100 → 0–11,000.  Precision: 0.01 °C

TILE_SIZE: int = 256
H_D_MAX: float = 20_000.0  # theoretical max J/m²/day

ENCODING_SCALE_BIN: int = 3
TEMP_ENCODING_SCALE_BIN: int = 100
TEMP_OFFSET: float = 50.0

# --- Data paths ---

NETCDF_FILENAME = "uvdvcclim_world_monthly.nc"
TEMP_NETCDF_FILENAME = "temperature_monthly.nc"

# --- Disclaimer ---

DISCLAIMER = (
    "This is an EDUCATIONAL MODEL. "
    "It is NOT medical advice. "
    "It does NOT diagnose vitamin D deficiency."
)
