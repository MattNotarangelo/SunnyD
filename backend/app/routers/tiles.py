from __future__ import annotations

import brotli
from fastapi import APIRouter, HTTPException, Query, Request
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


def _bin_response(raw: bytes, request: Request) -> Response:
    """Return raw uint16 bytes, Brotli-compressed if the client supports it."""
    headers = {"Cache-Control": "public, max-age=86400"}
    accept = request.headers.get("accept-encoding", "")
    if "br" in accept:
        body = brotli.compress(raw, quality=6)
        headers["Content-Encoding"] = "br"
    else:
        body = raw
    return Response(content=body, media_type="application/octet-stream", headers=headers)


@router.get("/base_tiles/{z}/{x}/{y}.bin")
def base_tile_bin(
    z: int,
    x: int,
    y: int,
    month: int = Query(..., ge=1, le=12),
    request: Request = ...,  # type: ignore[assignment]
) -> Response:
    if _tile_service is None:
        raise HTTPException(status_code=503, detail="UV tile service not initialized")
    _validate_tile(z, x, y)

    raw = _tile_service.get_tile_bin(month, z, x, y)
    return _bin_response(raw, request)


@router.get("/temp_tiles/{z}/{x}/{y}.bin")
def temp_tile_bin(
    z: int,
    x: int,
    y: int,
    month: int = Query(..., ge=1, le=12),
    request: Request = ...,  # type: ignore[assignment]
) -> Response:
    if _temp_tile_service is None:
        raise HTTPException(status_code=503, detail="Temperature tile service not initialized")
    _validate_tile(z, x, y)

    raw = _temp_tile_service.get_tile_bin(month, z, x, y)
    return _bin_response(raw, request)
