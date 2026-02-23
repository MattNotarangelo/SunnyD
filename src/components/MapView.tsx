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

interface Props {
  month: number;
  modelParams: ModelParams;
  onMapClick: (info: ClickInfo) => void;
}

export function MapView({ month, modelParams, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const versionRef = useRef(0);
  const monthRef = useRef(month);
  const paramsRef = useRef(modelParams);
  const onMapClickRef = useRef(onMapClick);

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
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setModelParams(paramsRef.current);
      updateTileSource();
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
