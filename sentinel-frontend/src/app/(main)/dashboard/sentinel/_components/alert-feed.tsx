"use client";

import Link from "next/link";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert } from "@/lib/sentinel/types";

import { NarrativeAlertCard } from "./narrative-alert-card";

interface AlertFeedProps {
  alerts: Alert[];
  limit?: number;
  showViewAll?: boolean;
}

export function AlertFeed({ alerts, limit, showViewAll = false }: AlertFeedProps) {
  const displayed = limit ? alerts.slice(0, limit) : alerts;
  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alert Feed</CardTitle>
            <CardDescription>
              {activeCount > 0 ? (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {activeCount} active alert{activeCount !== 1 ? "s" : ""} requiring attention
                </span>
              ) : (
                "No active alerts"
              )}
            </CardDescription>
          </div>
          {showViewAll && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/sentinel/alerts">
                View All
                <ExternalLink className="ml-1 size-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {displayed.map((alert) => (
            <NarrativeAlertCard key={alert.id} alert={alert} compact />
          ))}

          {displayed.length === 0 && (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              No alerts to display.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
