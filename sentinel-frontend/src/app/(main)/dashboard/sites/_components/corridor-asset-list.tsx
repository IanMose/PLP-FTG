"use client";

import { useState } from "react";

import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HeatPoint } from "@/lib/sentinel/corridor";
import { cn } from "@/lib/utils";

interface CorridorAssetListProps {
  points: HeatPoint[];
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

export function CorridorAssetList({ points, selectedAssetId, onSelect }: CorridorAssetListProps) {
  const [query, setQuery] = useState("");

  const sorted = [...points].sort((a, b) => b.weight - a.weight);

  const filtered = query
    ? sorted.filter(
        (p) =>
          p.assetId.toLowerCase().includes(query.toLowerCase()) ||
          p.band.toLowerCase().includes(query.toLowerCase()),
      )
    : sorted;

  const counts = points.reduce(
    (acc, p) => ({ ...acc, [p.band]: (acc[p.band] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <Card className="flex h-full flex-col rounded-none ring-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-normal">
          Corridor Assets
        </CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(["critical", "high", "medium", "low"] as HeatPoint["band"][]).map((b) => (
            <span key={b} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1", BAND_CLASSES[b])}>
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
            placeholder="Search assets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <ScrollArea className="h-0 flex-1">
          <div className="flex flex-col gap-2 pr-2">
            {filtered.map((p) => {
              const isSelected = p.assetId === selectedAssetId;
              return (
                <button
                  key={p.assetId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : p.assetId)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 ring-1 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2",
                    BAND_CLASSES[p.band],
                    isSelected && SELECTED_RING[p.band],
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full shrink-0", BAND_DOT[p.band])} />
                    <span className="font-mono text-xs font-medium">{p.assetId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-xs opacity-70">
                      {(p.weight * 100).toFixed(0)}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", BAND_CLASSES[p.band])}>
                      {p.band}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
