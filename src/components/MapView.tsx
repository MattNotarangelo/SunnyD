import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import type { ModelParams } from "../types";
import { registerProtocol, setModelParams } from "../model/tileProtocol";

const SOURCE_ID = "sunnyd-source";
const LAYER_ID = "sunnyd-layer";

let protocolRegistered = false;

interface ClickInfo {
  lat: number;
  lon: number;
}

export interface FocusTarget {
  lat: number;
  lon: number;
  zoom: number;
}

interface Props {
  month: number;
  modelParams: ModelParams;
  onMapClick: (info: ClickInfo) => void;
  focus?: FocusTarget | null;
}

export function MapView({ month, modelParams, onMapClick, focus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const versionRef = useRef(0);
  const monthRef = useRef(month);
  const paramsRef = useRef(modelParams);
  const onMapClickRef = useRef(onMapClick);
  const focusRef = useRef<FocusTarget | null>(focus ?? null);

  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  useEffect(() => {
    paramsRef.current = modelParams;
  }, [modelParams]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    setModelParams(modelParams);
  }, [modelParams]);

  const updateTileSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    versionRef.current += 1;
    const url = `sunnyd://{z}/{x}/{y}?month=${monthRef.current}&_v=${versionRef.current}`;

    const existingSource = map.getSource(SOURCE_ID);
    if (existingSource) {
      map.removeLayer(LAYER_ID);
      map.removeSource(SOURCE_ID);
    }

    map.addSource(SOURCE_ID, {
      type: "raster",
      tiles: [url],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 6,
    });

    map.addLayer({
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: {
        "raster-opacity": 0.8,
        "raster-fade-duration": 0,
      },
    });
  }, []);

  // Fly to a requested target (e.g. a search result or URL-shared point)
  useEffect(() => {
    focusRef.current = focus ?? null;
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom });
  }, [focus]);

  // Re-render tiles when month or model params change (debounced for fast slider dragging)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateTileSource();
    }, 80);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [month, modelParams, updateTileSource]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    if (!protocolRegistered) {
      registerProtocol();
      protocolRegistered = true;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [0, 20],
      zoom: 2,
      maxZoom: 6,
      hash: "map",
    });

    // No compass — the map is never rotated, and the dial reads as a spinner
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: false },
      trackUserLocation: false,
      fitBoundsOptions: { maxZoom: 5 },
    });
    map.addControl(geolocate, "top-right");
    geolocate.on("geolocate", (pos) => {
      const lon = (((pos.coords.longitude % 360) + 540) % 360) - 180;
      onMapClickRef.current({ lat: pos.coords.latitude, lon });
    });

    map.on("load", () => {
      mapRef.current = map;
      setModelParams(paramsRef.current);
      updateTileSource();
      // Apply a focus requested before the map finished loading
      const f = focusRef.current;
      if (f) map.jumpTo({ center: [f.lon, f.lat], zoom: f.zoom });
    });

    map.on("click", (e) => {
      const lon = (((e.lngLat.lng % 360) + 540) % 360) - 180;
      onMapClickRef.current({ lat: e.lngLat.lat, lon });
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [updateTileSource]);

  return <div ref={containerRef} className="flex-1 h-full" />;
}
