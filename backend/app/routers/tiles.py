from __future__ import annotations

import brotli
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from ..services.tile_service import TileService

router = APIRouter(prefix="/api", tags=["tiles"])

_tile_service: TileService | None = None
_temp_tile_service: TileService | None = None

_brotli_cache: dict[str, bytes] = {}


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


def _accepts_brotli(request: Request) -> bool:
    accept = request.headers.get("accept-encoding", "")
    return "br" in accept


def _brotli_compress(raw: bytes, cache_key: str) -> bytes:
    cached = _brotli_cache.get(cache_key)
    if cached is not None:
        return cached
    compressed = brotli.compress(raw, quality=6)
    _brotli_cache[cache_key] = compressed
    return compressed


def _bin_response(raw: bytes, request: Request, cache_key: str) -> Response:
    """Return raw uint16 bytes, Brotli-compressed if the client supports it."""
    if _accepts_brotli(request):
        body = _brotli_compress(raw, cache_key)
        return Response(
            content=body,
            media_type="application/octet-stream",
            headers={
                "Content-Encoding": "br",
                "Cache-Control": "public, max-age=86400",
            },
        )
    return Response(
        content=raw,
        media_type="application/octet-stream",
        headers={"Cache-Control": "public, max-age=86400"},
    )


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
    return _bin_response(raw, request, f"uv/{month}/{z}/{x}/{y}")


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
    return _bin_response(raw, request, f"temp/{month}/{z}/{x}/{y}")
