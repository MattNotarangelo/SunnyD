from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from ..services.tile_service import TileService

router = APIRouter(prefix="/api", tags=["tiles"])

_tile_service: TileService | None = None
_temp_tile_service: TileService | None = None


def init_tile_service(service: TileService) -> None:
    global _tile_service  # noqa: PLW0603
    _tile_service = service


def init_temp_tile_service(service: TileService) -> None:
    global _temp_tile_service  # noqa: PLW0603
    _temp_tile_service = service


def _validate_tile(z: int, x: int, y: int) -> None:
    if z < 0 or z > 10:
        raise HTTPException(status_code=400, detail="Zoom level out of range (0-10)")
    max_tile = (1 << z) - 1
    if x < 0 or x > max_tile or y < 0 or y > max_tile:
        raise HTTPException(status_code=400, detail="Tile coordinates out of range")


@router.get("/base_tiles/{z}/{x}/{y}.png")
def base_tile(
    z: int,
    x: int,
    y: int,
    month: int = Query(..., ge=1, le=12),
) -> Response:
    if _tile_service is None:
        raise HTTPException(status_code=503, detail="UV tile service not initialized")
    _validate_tile(z, x, y)

    png = _tile_service.get_tile_png(month, z, x, y)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/temp_tiles/{z}/{x}/{y}.png")
def temp_tile(
    z: int,
    x: int,
    y: int,
    month: int = Query(..., ge=1, le=12),
) -> Response:
    if _temp_tile_service is None:
        raise HTTPException(status_code=503, detail="Temperature tile service not initialized")
    _validate_tile(z, x, y)

    png = _temp_tile_service.get_tile_png(month, z, x, y)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
