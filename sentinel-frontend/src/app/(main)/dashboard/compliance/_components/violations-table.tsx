"use client";

import { AlertTriangle, Shield, ShieldAlert, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ComplianceViolation, SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface ViolationsTableProps {
  violations: ComplianceViolation[];
  limit?: number;
}

const severityStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High:     "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium:   "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low:      "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const severityIcons: Record<SeverityBand, typeof Shield> = {
  Critical: ShieldAlert,
  High:     AlertTriangle,
  Medium:   Shield,
  Low:      Shield,
};

const domainLabels: Record<string, string> = {
  SCD:  "Safety",
  ECD:  "Environmental",
  AICD: "Asset Integrity",
  RCD:  "Regulatory",
};

export function ViolationsTable({ violations, limit }: ViolationsTableProps) {
  const displayed = limit ? violations.slice(0, limit) : violations;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Compliance Violations</CardTitle>
        <CardDescription>
          {violations.length} open violation{violations.length !== 1 ? "s" : ""} requiring action
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Severity</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Recommended Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((v) => {
              const SevIcon = severityIcons[v.severity];
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <Badge className={cn("gap-1 text-[11px]", severityStyles[v.severity])}>
                      <SevIcon className="size-3" />
                      {v.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{v.ruleId}</div>
                    <div className="text-muted-foreground text-xs line-clamp-1">{v.description}</div>
                  </TableCell>
                  <TableCell className="text-sm">{v.siteName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {domainLabels[v.domainId] ?? v.domainId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{v.violationDate}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] line-clamp-2">
                    {v.recommendedAction ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {displayed.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                  No open violations.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
