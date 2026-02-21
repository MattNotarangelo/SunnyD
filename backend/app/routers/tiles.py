from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from ..services.tile_service import TileService

router = APIRouter(prefix="/api", tags=["tiles"])

_tile_service: TileService | None = None


def init_tile_service(service: TileService) -> None:
    global _tile_service  # noqa: PLW0603
    _tile_service = service


@router.get("/base_tiles/{z}/{x}/{y}.png")
def base_tile(
    z: int,
    x: int,
    y: int,
    month: int = Query(..., ge=1, le=12),
) -> Response:
    assert _tile_service is not None

    if z < 0 or z > 10:
        raise HTTPException(status_code=400, detail="Zoom level out of range (0–10)")

    max_tile = (1 << z) - 1
    if x < 0 or x > max_tile or y < 0 or y > max_tile:
        raise HTTPException(status_code=400, detail="Tile coordinates out of range")

    png = _tile_service.get_tile_png(month, z, x, y)

    return Response(
        content=png,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",
        },
    )
