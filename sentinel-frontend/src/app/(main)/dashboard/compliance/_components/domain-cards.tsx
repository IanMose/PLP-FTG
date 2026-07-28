"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DomainScore, RagStatus } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface DomainCardsProps {
  domains: DomainScore[];
}

const RAG_PROGRESS: Record<RagStatus, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-yellow-500",
  RED:   "bg-red-500",
};

const RAG_BADGE: Record<RagStatus, string> = {
  GREEN: "bg-green-500/10 text-green-700 dark:text-green-400",
  AMBER: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  RED:   "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function DomainCards({ domains }: DomainCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {domains.map((domain) => (
        <Card key={domain.domainId}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm leading-tight">{domain.domainName}</CardTitle>
                <CardDescription className="text-xs">Weight: {(domain.domainWeight * 100).toFixed(0)}%</CardDescription>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", RAG_BADGE[domain.ragStatus as RagStatus])}>
                {domain.ragStatus}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight">{domain.score.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">/ 100</span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", RAG_PROGRESS[domain.ragStatus as RagStatus])}
                style={{ width: `${domain.score}%` }}
              />
            </div>

            {/* Indicator breakdown */}
            {domain.indicators.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {domain.indicators.map((ind) => (
                  <div key={ind.indicatorId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground" title={ind.indicatorName}>
                      {ind.indicatorId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="relative h-1 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", RAG_PROGRESS[ind.ragStatus as RagStatus])}
                          style={{ width: `${ind.score}%` }}
                        />
                      </div>
                      <span className={cn("w-9 text-right text-[10px] font-medium tabular-nums", RAG_BADGE[ind.ragStatus as RagStatus])}>
                        {ind.score.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
