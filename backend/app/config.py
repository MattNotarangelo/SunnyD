from __future__ import annotations

MODEL_VERSION = "1.0.0"

# --- Model constants ---

T_WINDOW: int = 120  # minutes of midday sun window
C_IU: float = 0.10  # IU per (J/m²)
H_MIN: float = 200.0  # J/m²/day; below this → infinite minutes

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

# --- Data paths ---

NETCDF_FILENAME = "uvdvcclim_world_monthly.nc"

# --- Disclaimer ---

DISCLAIMER = (
    "This is an EDUCATIONAL MODEL. "
    "It is NOT medical advice. "
    "It does NOT diagnose vitamin D deficiency."
)
