import { BackendError } from "@/components/backend-error";
import { fetchSiteDetail } from "@/lib/sentinel/api";

import { SiteDetailView } from "../../_components/site-detail-view";

interface PageProps {
  params: Promise<{ siteId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { siteId } = await params;
  try {
    const site = await fetchSiteDetail(siteId);
    return <SiteDetailView site={site} />;
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
