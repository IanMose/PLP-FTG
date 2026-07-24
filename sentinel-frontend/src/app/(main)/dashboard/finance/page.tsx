import { format } from "date-fns";
import { Download, RotateCw, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAlerts, fetchQualitySummary } from "@/lib/sentinel/api";

import { AlertKpis } from "./_components/alert-kpis";
import { AlertTimeline } from "./_components/alert-timeline";
import { AlertTrendChart } from "./_components/alert-trend-chart";
import { FullAlertFeed } from "./_components/full-alert-feed";

export default async function Page() {
  const [alerts, quality] = await Promise.all([fetchAlerts(), fetchQualitySummary()]);

  const formattedDate = format(new Date(), "EEEE, do MMMM yyyy");

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
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <RotateCw className="size-4" />
              <span>Updated 5 min ago</span>
            </div>
            <Button size="sm" variant="outline">
              <Settings2 />
              Settings
            </Button>
            <Button size="sm" variant="outline">
              <Download data-icon="inline-start" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <AlertKpis alerts={alerts} quality={quality} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <AlertTrendChart />
            </div>
            <div className="xl:col-span-5">
              <AlertTimeline alerts={alerts} />
            </div>
          </div>

          <FullAlertFeed alerts={alerts} />
        </TabsContent>

        <TabsContent value="active">
          <FullAlertFeed alerts={alerts.filter((a) => a.status === "active")} />
        </TabsContent>

        <TabsContent value="history">
          <FullAlertFeed alerts={alerts.filter((a) => a.status !== "active")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
