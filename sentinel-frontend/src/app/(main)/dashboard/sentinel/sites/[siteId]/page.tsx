import { fetchSiteDetail } from "@/lib/sentinel/api";

import { SiteDetailView } from "../../_components/site-detail-view";

interface PageProps {
  params: Promise<{ siteId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { siteId } = await params;
  const site = await fetchSiteDetail(siteId);

  return <SiteDetailView site={site} />;
}
