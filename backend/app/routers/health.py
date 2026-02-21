from __future__ import annotations

from fastapi import APIRouter

from ..config import MODEL_VERSION

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "model_version": MODEL_VERSION}
