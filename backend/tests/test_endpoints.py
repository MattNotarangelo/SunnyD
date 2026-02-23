from __future__ import annotations

from fastapi.testclient import TestClient


class TestHealthEndpoint:
    def test_health_ok(self, client: TestClient) -> None:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "model_version" in body


class TestMethodologyEndpoint:
    def test_returns_all_fields(self, client: TestClient) -> None:
        resp = client.get("/api/methodology")
        assert resp.status_code == 200
        body = resp.json()
        assert "model_version" in body
        assert "equations" in body
        assert "constants" in body
        assert "fitzpatrick_table" in body
        assert "exposure_presets" in body
        assert "encoding" in body
        assert "disclaimer" in body

    def test_fitzpatrick_has_six_types(self, client: TestClient) -> None:
        body = client.get("/api/methodology").json()
        assert len(body["fitzpatrick_table"]) == 6


class TestEstimateEndpoint:
    def test_basic_estimate(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 7, "skin_type": 2, "coverage": 0.25},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "inputs" in body
        assert "intermediate" in body
        assert "outputs" in body
        assert "constants_used" in body
        assert body["outputs"]["is_infinite"] is False
        assert body["outputs"]["minutes_required"] is not None

    def test_preset_coverage(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 1, "skin_type": 1, "coverage_preset": "swimsuit"},
        )
        assert resp.status_code == 200
        assert resp.json()["inputs"]["coverage"] == 0.85

    def test_invalid_preset(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 1, "skin_type": 1, "coverage_preset": "naked"},
        )
        assert resp.status_code == 400

    def test_high_latitude_winter_very_long(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 89, "lon": 0, "month": 12, "skin_type": 6, "coverage": 0.05},
        )
        assert resp.status_code == 200
        body = resp.json()
        mins = body["outputs"]["minutes_required"]
        assert mins is None or mins > 1000

    def test_zero_coverage_is_infinite(self, client: TestClient) -> None:
        resp = client.get(
            "/api/estimate",
            params={"lat": 0, "lon": 0, "month": 1, "skin_type": 1, "coverage": 0.0},
        )
        assert resp.status_code == 200
        assert resp.json()["outputs"]["is_infinite"] is True

    def test_invalid_params(self, client: TestClient) -> None:
        resp = client.get("/api/estimate", params={"lat": 0, "lon": 0, "month": 13, "skin_type": 1})
        assert resp.status_code == 422


class TestBaseTileEndpoint:
    def test_returns_binary(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.bin", params={"month": 1})
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/octet-stream"
        assert len(resp.content) == 256 * 256 * 2  # uint16 per pixel

    def test_cache_header(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.bin", params={"month": 6})
        assert "max-age=86400" in resp.headers.get("cache-control", "")

    def test_invalid_zoom(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/11/0/0.bin", params={"month": 1})
        assert resp.status_code == 400

    def test_missing_month(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/0/0/0.bin")
        assert resp.status_code == 422

    def test_tile_out_of_range(self, client: TestClient) -> None:
        resp = client.get("/api/base_tiles/1/3/0.bin", params={"month": 1})
        assert resp.status_code == 400
