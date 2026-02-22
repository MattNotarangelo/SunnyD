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

TILE_SIZE: int = 256
ENCODING_SCALE: int = 100  # H_D_month * ENCODING_SCALE → 24-bit integer
H_D_MAX: float = 20_000.0  # theoretical max J/m²/day

# --- Temperature tile encoding ---
# encoded = (temp_celsius + TEMP_OFFSET) * TEMP_ENCODING_SCALE
# Range: -50 to +60 °C  →  0-11000, well within 24-bit RGB max (16.7M)
TEMP_ENCODING_SCALE: int = 100
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
