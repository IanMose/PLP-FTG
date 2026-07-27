"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";

import type { HeatPoint } from "@/lib/sentinel/corridor";

const BAND_COLOR: Record<HeatPoint["band"], string> = {
  low:      "#22c55e",
  medium:   "#eab308",
  high:     "#f97316",
  critical: "#ef4444",
};

const BAND_RADIUS: Record<HeatPoint["band"], number> = {
  low:      4,
  medium:   5,
  high:     6,
  critical: 7,
};

const HEAT_GRADIENT = {
  0.0:  "#22c55e",
  0.30: "#22c55e",
  0.55: "#eab308",
  0.75: "#f97316",
  1.0:  "#ef4444",
};

interface CorridorHeatmapMapProps {
  points: HeatPoint[];
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
}

interface Removable {
  remove: () => void;
}

/**
 * Normalise weights to [0.05, 1.0] so the heat layer always has visible
 * contrast even when all values cluster in a narrow band (e.g. all 0.44).
 */
function normaliseWeights(points: HeatPoint[]): [number, number, number][] {
  if (points.length === 0) return [];
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min;
  return points.map((p) => {
    const normalised = range === 0 ? 0.5 : 0.05 + ((p.weight - min) / range) * 0.95;
    return [p.lat, p.lon, normalised];
  });
}

export function CorridorHeatmapMap({ points, selectedAssetId, onSelect }: CorridorHeatmapMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Flipped to true once the Leaflet map instance is ready.
  // This is what re-triggers the markers effect after the async init completes.
  const [mapReady, setMapReady] = useState(false);

  // ── Initialise map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      // Fix Leaflet's broken default icon paths under webpack / Next.js
      type LeafletIconDefaultWithGetIconUrl = typeof L.Icon.Default & {
        prototype: { _getIconUrl?: unknown };
      };
      const IconDefault = L.Icon.Default as LeafletIconDefaultWithGetIconUrl;
      delete IconDefault.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current, { zoomControl: true })
        .setView([-2.5, 38.0], 7);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, © <a href='https://carto.com/'>CARTO</a>",
          subdomains: "abcd",
          maxZoom: 18,
        },
      ).addTo(map);

      map.on("click", () => { onSelectRef.current(null); });

      mapRef.current = map;
      // Signal that the map is ready — this triggers the markers effect below
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Render heat layer + markers ───────────────────────────────────────────
  // Depends on both `points` AND `mapReady` so it runs after async map init.
  useEffect(() => {
    if (!mapReady || !mapRef.current || points.length === 0) return;

    const map = mapRef.current;
    const layersToClean: Removable[] = [];
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");

      // leaflet.heat writes L.heatLayer onto the *global* window.L object.
      // When Leaflet is loaded as an ES module it doesn't register on window,
      // so we do it manually before importing the plugin.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L;
      await import("leaflet.heat");
      if (cancelled) return;

      // Heat layer with normalised weights for full contrast.
      // After the plugin import, L.heatLayer is now available on window.L.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heatFn = (window as any).L?.heatLayer;
      if (typeof heatFn === "function") {
        const heatData = normaliseWeights(points);
        const heatLayer = heatFn(heatData, {
          radius:   22,
          blur:     18,
          maxZoom:  14,
          gradient: HEAT_GRADIENT,
        }) as Removable;
        heatLayer.addTo(map);
        layersToClean.push(heatLayer);
      }

      // Circle markers for every band
      for (const p of points) {
        if (cancelled) break;
        const marker = L.circleMarker([p.lat, p.lon] as [number, number], {
          radius:      BAND_RADIUS[p.band],
          color:       BAND_COLOR[p.band],
          fillColor:   BAND_COLOR[p.band],
          fillOpacity: 0.85,
          weight:      1.5,
          interactive: true,
        })
          .bindTooltip(
            `<strong>${p.assetId}</strong><br/>${p.band.toUpperCase()} — score ${(p.weight * 100).toFixed(0)}`,
            { permanent: false, direction: "top" },
          )
          .on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectRef.current(p.assetId);
          })
          .addTo(map);

        layersToClean.push(marker);
      }
    })();

    return () => {
      cancelled = true;
      layersToClean.forEach((l) => l.remove());
    };
  }, [mapReady, points]);

  // ── Pan / zoom to selected asset ──────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedAssetId) return;
    const selected = points.find((p) => p.assetId === selectedAssetId);
    if (!selected) return;
    mapRef.current.flyTo([selected.lat, selected.lon], 12, { duration: 0.8 });
  }, [mapReady, selectedAssetId, points]);

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full rounded-lg"
      aria-label="Corridor risk heatmap — Mombasa to Nairobi pipeline"
      role="img"
    />
  );
}
