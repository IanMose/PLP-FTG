"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInterlockRules, useUpdateInterlockRule } from "@/lib/control-plane/api";
import type { InterlockRule } from "@/lib/control-plane/types";
import { ControlModeBadge } from "./badges/ControlModeBadge";

interface ControlModeConfigPanelProps {
  siteId: string;
}

export function ControlModeConfigPanel({ siteId }: ControlModeConfigPanelProps) {
  const { data: rules, isLoading } = useInterlockRules(siteId);
  const updateRule = useUpdateInterlockRule();
  const [pendingEmergency, setPendingEmergency] = useState<InterlockRule | null>(null);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading rules…
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No interlock rules configured for this site.
      </div>
    );
  }

  function handleChange(rule: InterlockRule, mode: string) {
    if (mode === "EMERGENCY") {
      setPendingEmergency(rule);
      return;
    }
    updateRule.mutate({
      siteId: rule.siteId,
      alertRuleType: rule.alertRuleType,
      controlMode: mode,
    });
  }

  return (
    <>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                {rule.alertRuleType.replace(/_/g, " ")}
              </div>
              {rule.updatedBy && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Last updated by {rule.updatedBy}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ControlModeBadge mode={rule.controlMode} />
              <ToggleGroup
                type="single"
                size="sm"
                value={rule.controlMode}
                onValueChange={(v) => v && handleChange(rule, v)}
                disabled={updateRule.isPending}
              >
                <ToggleGroupItem value="ADVISORY" className="text-xs">
                  Advisory
                </ToggleGroupItem>
                <ToggleGroupItem value="CONTROLLED" className="text-xs">
                  Controlled
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="EMERGENCY"
                  className="text-xs data-[state=on]:bg-red-900/40 data-[state=on]:text-red-400"
                >
                  Emergency
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency confirmation dialog */}
      <AlertDialog
        open={!!pendingEmergency}
        onOpenChange={(open) => !open && setPendingEmergency(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set this rule to Emergency mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Emergency mode pre-authorises the system to call the (simulated) actuator
              immediately when{" "}
              <strong>{pendingEmergency?.alertRuleType.replace(/_/g, " ")}</strong> fires,
              without waiting for a supervisor tap. This should only be enabled for rules
              the HSE team has explicitly reviewed and approved for automated response.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEmergency(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingEmergency) {
                  updateRule.mutate({
                    siteId: pendingEmergency.siteId,
                    alertRuleType: pendingEmergency.alertRuleType,
                    controlMode: "EMERGENCY",
                  });
                }
                setPendingEmergency(null);
              }}
            >
              Confirm Emergency mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
