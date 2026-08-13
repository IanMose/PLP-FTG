import { BackendError } from "@/components/backend-error";
import { fetchCorridorAssets, fetchRiskHeatmap } from "@/lib/sentinel/corridor";

import { CorridorSites } from "./_components/corridor-sites";

export default async function Page() {
  try {
    const [points, assets] = await Promise.all([
      fetchRiskHeatmap(),
      fetchCorridorAssets(),
    ]);
    return <CorridorSites points={points} assets={assets} />;
  } catch (err) {
    return (
      <div className="p-6">
        <div className="space-y-1 mb-4">
          <h1 className="text-3xl tracking-tight">Corridor Heatmap</h1>
        </div>
        <BackendError message={err instanceof Error ? err.message : "Failed to load corridor data"} />
      </div>
    );
  }
}
