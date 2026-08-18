"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DecisionOutcome, SeverityBand, SiteDetail } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";
import { NarrativeAlertCard } from "./narrative-alert-card";
import { RiskScoreBreakdown } from "./risk-score-breakdown";
import { WhatIfPanel } from "./what-if-panel";

interface SiteDetailViewProps {
  site: SiteDetail;
}

const severityStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const decisionStyles: Record<DecisionOutcome, string> = {
  trusted: "bg-green-500/10 text-green-700 dark:text-green-400",
  corrected: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  review: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const severityIcons: Record<SeverityBand, typeof Shield> = {
  Critical: ShieldAlert,
  High: AlertTriangle,
  Medium: Shield,
  Low: ShieldCheck,
};

export function SiteDetailView({ site }: SiteDetailViewProps) {
  const BandIcon = severityIcons[site.severityBand];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/sentinel">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl tracking-tight sm:text-3xl">{site.siteName}</h1>
            <p className="text-muted-foreground text-sm">{site.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("gap-1", severityStyles[site.severityBand])}>
            <BandIcon className="size-3" />
            {site.severityBand} Risk
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            Score: {site.riskScore}/100
          </Badge>
        </div>
      </div>

      {/* Active alert narrative briefing — surfaces the narrative as the
          first thing a safety officer reads when opening a site page */}
      {site.activeAlerts && site.activeAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {site.activeAlerts.map((alert) => (
            <NarrativeAlertCard key={alert.id} alert={alert} compact={false} />
          ))}
        </div>
      )}
      {/* Risk Analysis — Breakdown + What-If */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RiskScoreBreakdown
          riskScore={site.riskScore}
          severityBand={site.severityBand}
          incidentCount={site.incidentCount}
          critHighCount={site.critHighCount}
          daysSinceAudit={site.daysSinceAudit}
          rejectedRate={site.rejectedRate}
          pressureSpikeCount={site.pressureSpikeCount}
        />
        <WhatIfPanel
          siteId={site.siteId}
          currentScore={site.riskScore}
          currentBand={site.severityBand}
          liveIncidentCount={site.incidentCount}
          liveCritHighCount={site.critHighCount}
          liveDaysSinceAudit={site.daysSinceAudit}
          liveRejectedRate={site.rejectedRate}
          livePressureSpikes={site.pressureSpikeCount}
        />
      </div>

      {/* Incidents Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Incidents ({site.incidents.length})
          </CardTitle>
          <CardDescription>Incident history joined on site + date</CardDescription>
        </CardHeader>
        <CardContent>
          {site.incidents.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No incidents recorded.</p>
          ) : (
            <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[18px] before:w-px before:bg-border">
              {site.incidents.map((incident) => (
                <div key={incident.incidentId} className="relative flex gap-3 pl-10">
                  <div className="absolute left-2.5 top-1 flex size-3 items-center justify-center">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        incident.severity === "Critical" && "bg-red-500",
                        incident.severity === "High" && "bg-orange-500",
                        incident.severity === "Medium" && "bg-yellow-500",
                        incident.severity === "Low" && "bg-green-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 rounded-lg border p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{incident.incidentId}</span>
                        <Badge className={cn("text-[10px]", severityStyles[incident.severity])}>
                          {incident.severity}
                        </Badge>
                        <Badge className={cn("text-[10px]", decisionStyles[incident.decision])}>
                          {incident.decision}
                        </Badge>
                      </div>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="size-3" />
                        {format(new Date(incident.incidentDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm">{incident.description}</p>
                    <p className="text-muted-foreground text-xs">
                      Decision reason: {incident.decisionReason}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Compliance: {incident.complianceScore}/100</span>
                      {incident.closedDate && (
                        <span>Closed: {format(new Date(incident.closedDate), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Audits ({site.audits.length})
          </CardTitle>
          <CardDescription>Audit history for this site</CardDescription>
        </CardHeader>
        <CardContent>
          {site.audits.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No audits recorded.</p>
          ) : (
            <div className="space-y-3">
              {site.audits.map((audit) => (
                <div key={audit.auditId} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{audit.auditId}</span>
                      {audit.followUpRequired && (
                        <Badge className="bg-yellow-500/10 text-[10px] text-yellow-700 dark:text-yellow-400">
                          Follow-up required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {audit.auditor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(audit.inspectionDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm">{audit.findings}</p>
                  <p className="text-muted-foreground text-xs">
                    Compliance Score: {audit.complianceScore}/100
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
