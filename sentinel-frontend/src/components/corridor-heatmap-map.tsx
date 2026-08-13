"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";

import type { CorridorAsset, HeatPoint } from "@/lib/sentinel/corridor";

// ── Constants ─────────────────────────────────────────────────────────────────

const BAND_COLOR: Record<HeatPoint["band"], string> = {
  low:      "#22c55e",
  medium:   "#eab308",
  high:     "#f97316",
  critical: "#ef4444",
};

const BAND_RADIUS: Record<HeatPoint["band"], number> = {
  low:      5,
  medium:   6,
  high:     7,
  critical: 9,
};

const HEAT_GRADIENT = {
  0.0:  "#22c55e",
  0.30: "#22c55e",
  0.55: "#eab308",
  0.75: "#f97316",
  1.0:  "#ef4444",
};

// Flood zone → segment line colour
const FLOOD_LINE_COLOR: Record<string, string> = {
  high_flood:     "#ef4444",   // red
  moderate_flood: "#f97316",   // orange
  low:            "#22c55e",   // green
};

// ── Named KPC sites to show as labelled markers ───────────────────────────────
const NAMED_SITES = [
  { code: "SITE-001", name: "Nairobi Terminal",       lat: -1.2921,  lon:  36.8219 },
  { code: "SITE-002", name: "Mombasa Terminal",       lat: -4.0435,  lon:  39.6682 },
  { code: "SITE-003", name: "Makueni Pump Station",   lat: -2.2833,  lon:  37.8333 },
  { code: "SITE-004", name: "Nakuru Depot",           lat: -0.3031,  lon:  36.0800 },
  { code: "SITE-005", name: "Eldoret Depot",          lat:  0.5167,  lon:  35.2833 },
  { code: "SITE-006", name: "Sinendet Pump Station",  lat:  0.0500,  lon:  35.4500 },
] as const;

// ── Corridor waypoints: the physical pipeline route ───────────────────────────
// Sourced from generate_data.py CORRIDOR_WAYPOINTS_* arrays.
const CORRIDOR_MAIN: [number, number][] = [
  [-4.0435,  39.6682],  // Mombasa Terminal
  [-3.9600,  39.1700],  // Samburu
  [-3.5450,  38.7550],  // Maungu
  [-3.3960,  38.5567],  // Voi
  [-3.1900,  38.4500],  // Manyani
  [-2.6903,  38.1671],  // Mtito Andei
  [-2.2833,  37.8333],  // Makindu (SITE-003)
  [-1.9333,  37.3167],  // Sultan Hamud
  [-1.7500,  37.1500],  // Konza
  [-1.4560,  36.9770],  // Athi River
  [-1.2921,  36.8219],  // Nairobi Terminal (SITE-001)
];

const CORRIDOR_WESTERN: [number, number][] = [
  [-1.2921,  36.8219],  // Nairobi Terminal
  [-0.7167,  36.4333],  // Naivasha
  [-0.3031,  36.0800],  // Nakuru (SITE-004)
  [ 0.0500,  35.4500],  // Sinendet (SITE-006)
  [ 0.5167,  35.2833],  // Eldoret (SITE-005)
];

const CORRIDOR_KISUMU: [number, number][] = [
  [ 0.0500,  35.4500],  // Sinendet
  [-0.1500,  35.2000],  // Muhoroni
  [-0.1022,  34.7617],  // Kisumu
];

// Segment flood risk for each sub-line (used to colour the polyline)
const CORRIDOR_SEGMENTS: { points: [number, number][]; zone: string; label: string }[] = [
  { points: CORRIDOR_MAIN.slice(0, 2),   zone: "low",            label: "Mombasa–Samburu" },
  { points: CORRIDOR_MAIN.slice(1, 4),   zone: "moderate_flood", label: "Samburu–Voi" },
  { points: CORRIDOR_MAIN.slice(3, 7),   zone: "high_flood",     label: "Voi–Makindu" },
  { points: CORRIDOR_MAIN.slice(6, 9),   zone: "moderate_flood", label: "Makindu–Konza" },
  { points: CORRIDOR_MAIN.slice(8),      zone: "low",            label: "Konza–Nairobi" },
  { points: CORRIDOR_WESTERN.slice(0,3), zone: "moderate_flood", label: "Nairobi–Nakuru" },
  { points: CORRIDOR_WESTERN.slice(2),   zone: "high_flood",     label: "Nakuru–Eldoret" },
  { points: CORRIDOR_KISUMU,             zone: "moderate_flood", label: "Sinendet–Kisumu" },
];

// ── Tile layer definitions ─────────────────────────────────────────────────────
type TileTheme = "light" | "terrain";

const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string }> = {
  light: {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, © <a href='https://carto.com/'>CARTO</a>",
  },
  terrain: {
    name: "Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles © <a href='https://www.esri.com/'>Esri</a> &mdash; Esri, USGS, NOAA",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function buildPopupHtml(p: HeatPoint, meta?: CorridorAsset): string {
  const score = (p.weight * 100).toFixed(0);
  const bandLabel = p.band.toUpperCase();
  const bandColor = BAND_COLOR[p.band];

  const floodLabel = meta?.floodLandslideRiskZone
    ? ({ high_flood: "⚠ High flood risk", moderate_flood: "~ Moderate flood risk", low: "✓ Low flood risk" }[meta.floodLandslideRiskZone] ?? meta.floodLandslideRiskZone)
    : null;

  const sensors = meta?.sensorSuite
    ? meta.sensorSuite.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const siteLink = meta?.nearestSiteCode
    ? `<a href="/dashboard/sentinel/sites/${meta.nearestSiteCode.toLowerCase()}" style="color:#3b82f6;text-decoration:underline;font-size:11px">View site incidents →</a>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;min-width:200px;font-size:12px;line-height:1.5">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:700;font-size:13px">${p.assetId}</span>
        <span style="background:${bandColor}22;color:${bandColor};border:1px solid ${bandColor}55;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600">${bandLabel}</span>
      </div>
      <div style="display:grid;gap:3px">
        <div><span style="color:#9ca3af">Risk score:</span> <strong style="color:${bandColor}">${score}/100</strong></div>
        ${meta?.segment ? `<div><span style="color:#9ca3af">Segment:</span> ${meta.segment}</div>` : ""}
        ${meta && meta.chainageKmApprox > 0 ? `<div><span style="color:#9ca3af">Chainage:</span> ~${meta.chainageKmApprox} km</div>` : ""}
        ${meta?.assetType ? `<div><span style="color:#9ca3af">Type:</span> ${meta.assetType.replace(/_/g, " ")}</div>` : ""}
        ${floodLabel ? `<div><span style="color:#9ca3af">Flood zone:</span> ${floodLabel}</div>` : ""}
        ${meta?.nearestSiteCode ? `<div><span style="color:#9ca3af">Nearest site:</span> ${meta.nearestSiteCode}</div>` : ""}
        ${sensors.length > 0 ? `<div><span style="color:#9ca3af">Sensors:</span> ${sensors.join(", ")}</div>` : ""}
        <div style="font-size:10px;color:#9ca3af">Lat ${p.lat.toFixed(4)}, Lon ${p.lon.toFixed(4)}</div>
        ${siteLink ? `<div style="margin-top:4px">${siteLink}</div>` : ""}
      </div>
    </div>
  `.trim();
}

interface Removable {
  remove: () => void;
  // biome-ignore lint/suspicious/noExplicitAny: leaflet.heat returns a dynamic layer
  addTo: (map: any) => this;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CorridorHeatmapMapProps {
  points: HeatPoint[];
  assets: CorridorAsset[];
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
}

export function CorridorHeatmapMap({ points, assets, selectedAssetId, onSelect }: CorridorHeatmapMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef    = useRef<import("leaflet").TileLayer | null>(null);
  const onSelectRef     = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const [mapReady, setMapReady]     = useState(false);
  const [theme, setTheme]           = useState<TileTheme>("light");

  // Build assetId → CorridorAsset lookup once
  const assetMap = new Map(assets.map((a) => [a.assetId, a]));

  // ── Initialise map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      // Fix broken default icon paths under webpack/Next.js
      type IconDefaultExt = typeof L.Icon.Default & { prototype: { _getIconUrl?: unknown } };
      const IconDefault = L.Icon.Default as IconDefaultExt;
      delete IconDefault.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([-2.5, 38.0], 7);

      const tl = L.tileLayer(TILE_LAYERS.light.url, {
        attribution: TILE_LAYERS.light.attribution,
        maxZoom: 18,
      }).addTo(map);
      tileLayerRef.current = tl;

      map.on("click", () => { onSelectRef.current(null); });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Swap tile layer when theme changes ──────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      tileLayerRef.current?.remove();
      const cfg = TILE_LAYERS[theme];
      tileLayerRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: 18,
      }).addTo(mapRef.current);
    });
  }, [mapReady, theme]);

  // ── Render corridor lines, site markers, heat layer, asset markers ───────
  useEffect(() => {
    if (!mapReady || !mapRef.current || points.length === 0) return;

    const map = mapRef.current;
    const layersToClean: Removable[] = [];
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled) return;

      // ── 1. Corridor polylines coloured by flood zone ──────────────────
      for (const seg of CORRIDOR_SEGMENTS) {
        if (seg.points.length < 2) continue;
        const color = FLOOD_LINE_COLOR[seg.zone] ?? "#6b7280";
        const line = L.polyline(seg.points, {
          color,
          weight:    3.5,
          opacity:   0.75,
          dashArray: seg.zone === "low" ? undefined : seg.zone === "moderate_flood" ? "6 4" : "2 4",
        })
          .bindTooltip(
            `<strong>${seg.label}</strong><br/><span style="font-size:11px">${
              seg.zone === "high_flood"     ? "⚠ High flood/landslide risk" :
              seg.zone === "moderate_flood" ? "~ Moderate flood risk" :
              "✓ Low flood risk"
            }</span>`,
            { sticky: true },
          )
          .addTo(map);
        layersToClean.push(line);
      }

      // ── 2. Named site markers ─────────────────────────────────────────
      for (const site of NAMED_SITES) {
        if (cancelled) break;
        const isHighRisk = site.code === "SITE-003" || site.code === "SITE-006";
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background:${isHighRisk ? "#ef4444" : "#3b82f6"};
              color:#fff;
              border-radius:50%;
              width:${isHighRisk ? 14 : 12}px;
              height:${isHighRisk ? 14 : 12}px;
              border:2px solid #fff;
              box-shadow:0 1px 4px rgba(0,0,0,.4);
              display:flex;align-items:center;justify-content:center;
            "></div>`,
          iconSize: [isHighRisk ? 14 : 12, isHighRisk ? 14 : 12],
          iconAnchor: [isHighRisk ? 7 : 6, isHighRisk ? 7 : 6],
        });

        const marker = L.marker([site.lat, site.lon], { icon, zIndexOffset: 1000 })
          .bindTooltip(
            `<div style="font-family:system-ui,sans-serif;font-size:12px">
              <strong>${site.name}</strong><br/>
              <span style="font-size:10px;color:#9ca3af">${site.code}${isHighRisk ? " · High-risk site" : ""}</span><br/>
              <a href="/dashboard/sentinel/sites/${site.code.toLowerCase()}" style="color:#3b82f6;font-size:11px;text-decoration:underline">View incidents →</a>
            </div>`,
            { direction: "top", offset: [0, -8] },
          )
          .addTo(map);
        layersToClean.push(marker);
      }

      // ── 3. Heat layer ─────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L;
      await import("leaflet.heat");
      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heatFn = (window as any).L?.heatLayer;
      if (typeof heatFn === "function") {
        const heatLayer = heatFn(normaliseWeights(points), {
          radius:   22,
          blur:     18,
          maxZoom:  14,
          gradient: HEAT_GRADIENT,
        }) as Removable;
        heatLayer.addTo(map);
        layersToClean.push(heatLayer);
      }

      // ── 4. Asset circle markers with rich popups ──────────────────────
      for (const p of points) {
        if (cancelled) break;
        const meta = assetMap.get(p.assetId);

        const marker = L.circleMarker([p.lat, p.lon] as [number, number], {
          radius:      BAND_RADIUS[p.band],
          color:       BAND_COLOR[p.band],
          fillColor:   BAND_COLOR[p.band],
          fillOpacity: 0.85,
          weight:      1.5,
          interactive: true,
        })
          .bindPopup(buildPopupHtml(p, meta), {
            maxWidth:  260,
            className: "sentinel-popup",
          })
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
  }, [mapReady, points, assetMap]);

  // ── Pan/zoom to selected asset ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedAssetId) return;
    const selected = points.find((p) => p.assetId === selectedAssetId);
    if (!selected) return;
    mapRef.current.flyTo([selected.lat, selected.lon], 13, { duration: 0.8 });
  }, [mapReady, selectedAssetId, points]);

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="h-full w-full rounded-lg"
        aria-label="Corridor risk heatmap — Mombasa to Nairobi pipeline"
        role="img"
      />

      {/* Tile theme toggle — top-right inside the map */}
      <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-md border bg-background shadow-sm">
        {(["light", "terrain"] as TileTheme[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              theme === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {TILE_LAYERS[t].name}
          </button>
        ))}
      </div>

      {/* Corridor legend — bottom-left inside the map */}
      <div className="absolute bottom-8 left-3 z-[1000] rounded-md border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm">
        <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pipeline corridor</p>
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center gap-2">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#ef4444" strokeWidth="3" /></svg>
            <span>High flood risk</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#f97316" strokeWidth="3" strokeDasharray="6 4" /></svg>
            <span>Moderate flood risk</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#22c55e" strokeWidth="3" /></svg>
            <span>Low flood risk</span>
          </div>
          <div className="flex items-center gap-2 mt-1 border-t pt-1">
            <span className="inline-block size-3 rounded-full border-2 border-white bg-red-500 shadow" />
            <span>High-risk site</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full border-2 border-white bg-blue-500 shadow" />
            <span>Named site</span>
          </div>
        </div>
      </div>
    </div>
  );
}
