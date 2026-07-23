"use client";

import Link from "next/link";

import { Bell, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const recentAlerts = [
  {
    id: "alert-001",
    title: "Data quality gate failed",
    site: "Gold Coast Marina",
    severity: "Critical",
    time: "1h ago",
  },
  {
    id: "alert-002",
    title: "High rejection rate detected",
    site: "Melbourne Central",
    severity: "Critical",
    time: "2h ago",
  },
  {
    id: "alert-003",
    title: "Audit overdue",
    site: "Adelaide South",
    severity: "High",
    time: "4h ago",
  },
];

const severityDot: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

export function NotificationBell() {
  const activeCount = recentAlerts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 font-medium text-[10px] text-white">
              {activeCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">Sentinel Alerts</span>
          </div>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-700 text-xs dark:text-red-400">
            {activeCount} active
          </span>
        </div>
        <div className="flex flex-col divide-y">
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", severityDot[alert.severity])} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{alert.title}</p>
                <p className="text-muted-foreground text-xs">
                  {alert.site} · {alert.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/dashboard/finance">View all alerts</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
