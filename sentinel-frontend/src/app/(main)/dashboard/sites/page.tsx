import { fetchRiskHeatmap } from "@/lib/sentinel/corridor";

import { CorridorSites } from "./_components/corridor-sites";

export default async function Page() {
  const points = await fetchRiskHeatmap();
  return <CorridorSites points={points} />;
}
