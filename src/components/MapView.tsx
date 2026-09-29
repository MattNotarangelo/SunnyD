import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Selected point, shown with a marker. */
  selected?: ClickInfo | null;
  /** Pixels of map covered by a bottom sheet; the selected point is kept above it. */
  bottomInset?: number;
}

/** Space reserved for the floating controls along the top edge on small screens. */
const TOP_CHROME_PX = 120;

export function MapView({ month, modelParams, onMapClick, focus, selected = null, bottomInset = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const versionRef = useRef(0);
  const monthRef = useRef(month);
  const paramsRef = useRef(modelParams);
  const onMapClickRef = useRef(onMapClick);
  const focusRef = useRef<FocusTarget | null>(focus ?? null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

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

  // Marker on the selected point
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!selected) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "sunnyd-marker";
      el.setAttribute("aria-hidden", "true");
      markerRef.current = new maplibregl.Marker({ element: el });
    }
    markerRef.current.setLngLat([selected.lon, selected.lat]).addTo(map);
  }, [selected, mapReady]);

  // Keep the selected point visible above a bottom sheet (small screens)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selected || bottomInset <= 0) return;

    const reveal = () => {
      const { y } = map.project([selected.lon, selected.lat]);
      const h = map.getContainer().clientHeight;
      if (y > h - bottomInset - 32 || y < TOP_CHROME_PX) {
        map.easeTo({
          center: [selected.lon, selected.lat],
          // Centre the point in the band between the top controls and the sheet
          offset: [0, (TOP_CHROME_PX - bottomInset) / 2],
          duration: 400,
        });
      }
    };

    // Let a fly-to (search, shared link) land before checking
    if (map.isMoving()) {
      map.once("moveend", reveal);
      return () => { map.off("moveend", reveal); };
    }
    reveal();
  }, [selected, bottomInset, mapReady]);

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
      // Rotation/tilt serve no purpose here — keep the map north-up and flat
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

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
      setMapReady(true);
      setModelParams(paramsRef.current);
      updateTileSource();
      // Apply a focus requested before the map finished loading
      const f = focusRef.current;
      if (f) map.jumpTo({ center: [f.lon, f.lat], zoom: f.zoom });
    });

    // Keyboard: arrows pan (MapLibre), Enter/Space checks the point under the crosshair
    const canvas = map.getCanvas();
    canvas.setAttribute("aria-label", "Map. Arrow keys pan, plus and minus zoom, Enter checks the centre point.");
    const onKeyDown = (e: KeyboardEvent) => {
      setKeyboardFocus(true);
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const c = map.getCenter();
      const lon = (((c.lng % 360) + 540) % 360) - 180;
      onMapClickRef.current({ lat: c.lat, lon });
    };
    const onFocus = () => setKeyboardFocus(canvas.matches(":focus-visible"));
    const onBlur = () => setKeyboardFocus(false);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("focus", onFocus);
    canvas.addEventListener("blur", onBlur);

    map.on("click", (e) => {
      const lon = (((e.lngLat.lng % 360) + 540) % 360) - 180;
      onMapClickRef.current({ lat: e.lngLat.lat, lon });
    });

    return () => {
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onBlur);
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
      map.remove();
    };
  }, [updateTileSource]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="h-full w-full" />
      {keyboardFocus && (
        <div className="sunnyd-crosshair" aria-hidden="true" />
      )}
    </div>
  );
}
