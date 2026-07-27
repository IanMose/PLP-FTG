"use client";

import { useState } from "react";

import dynamic from "next/dynamic";

import type { HeatPoint } from "@/lib/sentinel/corridor";

import { CorridorAssetList } from "./corridor-asset-list";

const CorridorHeatmapMap = dynamic(
  () => import("@/components/corridor-heatmap-map").then((m) => m.CorridorHeatmapMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" aria-label="Loading map..." />
    ),
  },
);

interface CorridorSitesProps {
  points: HeatPoint[];
}

export function CorridorSites({ points }: CorridorSitesProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <div
      data-content-padding="false"
      className="grid h-[calc(100dvh-var(--dashboard-header-height))] overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)] lg:divide-x"
    >
      {/* Left — asset list */}
      <div className="h-full overflow-hidden">
        <CorridorAssetList
          points={points}
          selectedAssetId={selectedAssetId}
          onSelect={setSelectedAssetId}
        />
      </div>

      {/* Right — geo heatmap */}
      <div className="hidden h-full p-3 lg:block">
        <CorridorHeatmapMap
          points={points}
          selectedAssetId={selectedAssetId}
          onSelect={setSelectedAssetId}
        />
      </div>
    </div>
  );
}
