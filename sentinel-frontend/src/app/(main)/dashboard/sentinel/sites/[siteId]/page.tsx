import { BackendError } from "@/components/backend-error";
import { fetchSiteDetail, fetchSitePrediction } from "@/lib/sentinel/api";

import { ModelPredictionCard } from "../../_components/model-prediction-card";
import { SiteDetailView } from "../../_components/site-detail-view";

interface PageProps {
  params: Promise<{ siteId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { siteId } = await params;
  try {
    // Fetch site detail and ML prediction in parallel
    const [site, prediction] = await Promise.all([
      fetchSiteDetail(siteId),
      fetchSitePrediction(siteId).catch(() => null), // non-fatal if model not trained
    ]);
    return (
      <div className="flex flex-col gap-4">
        {prediction !== undefined && (
          <ModelPredictionCard prediction={prediction} />
        )}
        <SiteDetailView site={site} />
      </div>
    );
  } catch (err) {
    return (
      <div className="p-6">
        <BackendError
          message={err instanceof Error ? err.message : `Failed to load site ${siteId}`}
          kind={err instanceof Error && err.message.includes("404") ? "response" : "connection"}
        />
      </div>
    );
  }
}
