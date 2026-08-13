"use client";

import { useState } from "react";

import { Layers, List, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CorridorAsset, HeatPoint } from "@/lib/sentinel/corridor";
import { cn } from "@/lib/utils";

interface CorridorAssetListProps {
  points: HeatPoint[];
  assets: CorridorAsset[];
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
}

const BAND_CLASSES: Record<HeatPoint["band"], string> = {
  critical: "bg-red-100 text-red-700 ring-red-300 dark:bg-red-950/80 dark:text-red-400 dark:ring-red-500/40",
  high:     "bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-950/70 dark:text-orange-400 dark:ring-orange-500/40",
  medium:   "bg-yellow-100 text-yellow-700 ring-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-400 dark:ring-yellow-500/30",
  low:      "bg-green-100 text-green-700 ring-green-300 dark:bg-green-950/70 dark:text-green-400 dark:ring-green-500/40",
};

const BAND_DOT: Record<HeatPoint["band"], string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-yellow-500",
  low:      "bg-green-500",
};

const SELECTED_RING: Record<HeatPoint["band"], string> = {
  critical: "ring-2 ring-red-500",
  high:     "ring-2 ring-orange-500",
  medium:   "ring-2 ring-yellow-500",
  low:      "ring-2 ring-green-500",
};

const FLOOD_LABEL: Record<string, string> = {
  high_flood:     "⚠ High flood",
  moderate_flood: "~ Moderate flood",
  low:            "✓ Low flood",
};

const FLOOD_CLASS: Record<string, string> = {
  high_flood:     "text-red-600 dark:text-red-400",
  moderate_flood: "text-amber-600 dark:text-amber-400",
  low:            "text-green-600 dark:text-green-400",
};

// Derive sensor status from sensorSuite string — a rough "all present" check
function sensorStatus(suite: string): { label: string; dot: string } {
  const sensors = suite.split(",").map((s) => s.trim()).filter(Boolean);
  if (sensors.length === 0) return { label: "No sensors", dot: "bg-gray-400" };
  if (sensors.length >= 4) return { label: "All sensors OK", dot: "bg-green-500" };
  if (sensors.length >= 2) return { label: "Partial sensors", dot: "bg-amber-500" };
  return { label: "Limited sensors", dot: "bg-red-500" };
}

export function CorridorAssetList({ points, assets, selectedAssetId, onSelect }: CorridorAssetListProps) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "segment">("list");

  // Join points → asset metadata
  const assetMap = new Map(assets.map((a) => [a.assetId, a]));

  const sorted = [...points].sort((a, b) => b.weight - a.weight);

  const filtered = query
    ? sorted.filter(
        (p) => {
          const meta = assetMap.get(p.assetId);
          return (
            p.assetId.toLowerCase().includes(query.toLowerCase()) ||
            p.band.toLowerCase().includes(query.toLowerCase()) ||
            meta?.segment?.toLowerCase().includes(query.toLowerCase()) ||
            meta?.floodLandslideRiskZone?.toLowerCase().includes(query.toLowerCase())
          );
        },
      )
    : sorted;

  const counts = points.reduce(
    (acc, p) => ({ ...acc, [p.band]: (acc[p.band] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  // Group by segment for segment view
  const bySegment = filtered.reduce((acc, p) => {
    const meta = assetMap.get(p.assetId);
    const seg = meta?.segment ?? "Unknown Segment";
    if (!acc[seg]) acc[seg] = [];
    acc[seg].push(p);
    return acc;
  }, {} as Record<string, HeatPoint[]>);

  const segmentEntries = Object.entries(bySegment).sort(([, aPoints], [, bPoints]) => {
    // Sort segments by highest risk weight in that segment
    const aMax = Math.max(...aPoints.map((p) => p.weight));
    const bMax = Math.max(...bPoints.map((p) => p.weight));
    return bMax - aMax;
  });

  return (
    <Card className="flex h-full flex-col rounded-none ring-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-normal">Corridor Assets</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
              title="Asset list"
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === "segment" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("segment")}
              title="Group by segment"
            >
              <Layers className="size-4" />
            </Button>
          </div>
        </div>

        {/* Band summary pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(["critical", "high", "medium", "low"] as HeatPoint["band"][]).map((b) => (
            <span
              key={b}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1",
                BAND_CLASSES[b],
              )}
            >
              <span className={cn("size-1.5 rounded-full", BAND_DOT[b])} />
              {b.charAt(0).toUpperCase() + b.slice(1)}: {counts[b] ?? 0}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
        <InputGroup className="h-8">
          <InputGroupInput
            className="h-8"
            aria-label="Search assets"
            placeholder="Search by ID, segment, flood zone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <ScrollArea className="h-0 flex-1">
          {viewMode === "list" ? (
            <div className="flex flex-col gap-2 pr-2">
              {filtered.map((p) => {
                const meta = assetMap.get(p.assetId);
                const isSelected = p.assetId === selectedAssetId;
                const status = meta ? sensorStatus(meta.sensorSuite) : null;
                return (
                  <button
                    key={p.assetId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(isSelected ? null : p.assetId)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 ring-1 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2",
                      BAND_CLASSES[p.band],
                      isSelected && SELECTED_RING[p.band],
                    )}
                  >
                    {/* Row 1: ID + score + band */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full shrink-0", BAND_DOT[p.band])} />
                        <span className="font-mono text-xs font-semibold">{p.assetId}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums text-xs opacity-70">
                          {(p.weight * 100).toFixed(0)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", BAND_CLASSES[p.band])}
                        >
                          {p.band}
                        </Badge>
                      </div>
                    </div>

                    {/* Row 2: segment + chainage (if available) */}
                    {meta && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4 text-[11px] opacity-80">
                        <span className="truncate">{meta.segment}</span>
                        {meta.chainageKmApprox > 0 && (
                          <span className="shrink-0">~{meta.chainageKmApprox} km</span>
                        )}
                      </div>
                    )}

                    {/* Row 3: flood zone + sensor status */}
                    {meta && (
                      <div className="flex items-center justify-between pl-4 text-[10px]">
                        <span className={cn("font-medium", FLOOD_CLASS[meta.floodLandslideRiskZone] ?? "text-muted-foreground")}>
                          {FLOOD_LABEL[meta.floodLandslideRiskZone] ?? meta.floodLandslideRiskZone}
                        </span>
                        {status && (
                          <span className="flex items-center gap-1 opacity-70">
                            <span className={cn("size-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Segment view ─────────────────────────────────────────── */
            <div className="flex flex-col gap-3 pr-2">
              {segmentEntries.map(([segment, segPoints]) => {
                const maxBand = segPoints.reduce<HeatPoint["band"]>(
                  (worst, p) => {
                    const order: HeatPoint["band"][] = ["low", "medium", "high", "critical"];
                    return order.indexOf(p.band) > order.indexOf(worst) ? p.band : worst;
                  },
                  "low",
                );
                const avgScore = Math.round(
                  (segPoints.reduce((s, p) => s + p.weight, 0) / segPoints.length) * 100,
                );
                const critCount = segPoints.filter((p) => p.band === "critical").length;

                return (
                  <div key={segment} className="rounded-lg border overflow-hidden">
                    {/* Segment header */}
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2",
                        BAND_CLASSES[maxBand],
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("size-2 shrink-0 rounded-full", BAND_DOT[maxBand])} />
                        <span className="truncate text-xs font-semibold">{segment}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {critCount > 0 && (
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                            {critCount} critical
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", BAND_CLASSES[maxBand])}
                        >
                          avg {avgScore}
                        </Badge>
                        <span className="text-[10px] opacity-60">{segPoints.length} pts</span>
                      </div>
                    </div>

                    {/* Assets in segment */}
                    <div className="flex flex-col divide-y">
                      {segPoints.map((p) => {
                        const isSelected = p.assetId === selectedAssetId;
                        const meta = assetMap.get(p.assetId);
                        return (
                          <button
                            key={p.assetId}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelect(isSelected ? null : p.assetId)}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none",
                              isSelected && "bg-muted",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("size-1.5 rounded-full shrink-0", BAND_DOT[p.band])} />
                              <span className="font-mono text-xs">{p.assetId}</span>
                              {meta?.floodLandslideRiskZone === "high_flood" && (
                                <span className="text-[10px] text-red-500">⚠</span>
                              )}
                            </div>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {(p.weight * 100).toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
