import { format } from "date-fns";

import { BackendError } from "@/components/backend-error";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cachedFetchAlerts, cachedFetchQualitySummary } from "@/lib/sentinel/cached-fetches";

import { AlertKpis } from "./_components/alert-kpis";
import { AlertTimeline } from "./_components/alert-timeline";
import { AlertTrendChart } from "./_components/alert-trend-chart";
import { AlertsToolbar } from "./_components/alerts-toolbar";
import { FullAlertFeed } from "./_components/full-alert-feed";

export default async function Page() {
  const formattedDate = format(new Date(), "EEEE, do MMMM yyyy");

  try {
    const [alerts, quality] = await Promise.all([cachedFetchAlerts(), cachedFetchQualitySummary()]);

    const activeAlerts  = alerts.filter((a) => a.status === "active");
    const historyAlerts = alerts.filter((a) => a.status !== "active");

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">{formattedDate}</p>
        </div>

        <Tabs defaultValue="overview" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="active">
                Active
                {activeAlerts.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-red-600 text-xs tabular-nums dark:text-red-400">
                    {activeAlerts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <AlertsToolbar alerts={alerts} />
          </div>

          <TabsContent value="overview" className="flex flex-col gap-4">
            <AlertKpis alerts={alerts} quality={quality} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <AlertTrendChart alerts={alerts} />
              </div>
              <div className="xl:col-span-5">
                <AlertTimeline alerts={alerts} />
              </div>
            </div>
            <FullAlertFeed alerts={alerts} />
          </TabsContent>

          <TabsContent value="active">
            <div className="mb-4 flex justify-end">
              <AlertsToolbar alerts={activeAlerts} updatedLabel={`${activeAlerts.length} active alerts`} />
            </div>
            <FullAlertFeed alerts={activeAlerts} />
          </TabsContent>

          <TabsContent value="history">
            <div className="mb-4 flex justify-end">
              <AlertsToolbar alerts={historyAlerts} updatedLabel={`${historyAlerts.length} resolved / acknowledged`} />
            </div>
            <FullAlertFeed alerts={historyAlerts} />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">{formattedDate}</p>
        </div>
        <BackendError message={err instanceof Error ? err.message : "Failed to load alerts"} />
      </div>
    );
  }
}
