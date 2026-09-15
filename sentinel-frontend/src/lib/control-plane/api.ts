"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TankTelemetry,
  InterlockRule,
  ControlRoomScenario,
  ControlRoomRunResult,
  ActuationLogEntry,
  ExecutiveSummaryV5,
} from "./types";
import {
  USE_MOCK_DATA,
  mockTankTelemetry,
  mockInterlockRules,
  mockScenarios,
  buildMockScenarioResult,
  mockActuationLog,
  mockExecutiveSummary,
} from "./mocks";

// ── helpers ───────────────────────────────────────────────────────────────────

async function proxyGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

async function proxyPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

async function proxyPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

// ── Live Tank Monitor ─────────────────────────────────────────────────────────

export function useTankTelemetryList(siteId?: string) {
  return useQuery({
    queryKey: ["tank-telemetry", siteId ?? "all"],
    queryFn: async (): Promise<TankTelemetry[]> => {
      if (USE_MOCK_DATA) {
        return siteId
          ? mockTankTelemetry.filter((t) => t.siteId === siteId)
          : mockTankTelemetry;
      }
      const path = siteId
        ? `/api/proxy/tank-telemetry/${siteId}/live`
        : "/api/proxy/tank-telemetry/live";
      return proxyGet<TankTelemetry[]>(path);
    },
    refetchInterval: 3_000,
    staleTime: 1_000,
  });
}

// ── Interlock Control Center ──────────────────────────────────────────────────

export function useInterlockRules(siteId?: string) {
  return useQuery({
    queryKey: ["interlock-rules", siteId ?? "all"],
    queryFn: async (): Promise<InterlockRule[]> => {
      if (USE_MOCK_DATA) {
        return siteId
          ? mockInterlockRules.filter((r) => r.siteId === siteId)
          : mockInterlockRules;
      }
      return proxyGet<InterlockRule[]>("/api/proxy/interlock/rules");
    },
    staleTime: 5_000,
  });
}

export function useUpdateInterlockRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      siteId: string;
      alertRuleType: string;
      controlMode: string;
    }) => {
      if (USE_MOCK_DATA) {
        return { message: "Mock: control mode updated" };
      }
      return proxyPut<InterlockRule>(
        `/api/proxy/interlock/rules/${vars.siteId}/${vars.alertRuleType}`,
        { controlMode: vars.controlMode },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interlock-rules"] }),
  });
}

// ── Control Room ──────────────────────────────────────────────────────────────

export function useControlRoomScenarios() {
  return useQuery({
    queryKey: ["control-room-scenarios"],
    queryFn: async (): Promise<ControlRoomScenario[]> => {
      if (USE_MOCK_DATA) return mockScenarios;
      return proxyGet<ControlRoomScenario[]>("/api/proxy/control-room/scenarios");
    },
    staleTime: 60_000,
  });
}

export function useRunControlRoomScenario() {
  return useMutation({
    mutationFn: async (scenarioId: string): Promise<ControlRoomRunResult> => {
      if (USE_MOCK_DATA) {
        // Simulate a slight delay for realism
        await new Promise((r) => setTimeout(r, 800));
        return buildMockScenarioResult(scenarioId);
      }
      return proxyPost<ControlRoomRunResult>(
        `/api/proxy/control-room/run/${scenarioId}`,
        {},
      );
    },
  });
}

// ── Actuation & Verification Log ──────────────────────────────────────────────

export function useActuationLog(filters: {
  siteId?: string;
  verifiedState?: string;
} = {}) {
  return useQuery({
    queryKey: ["actuation-log", filters],
    queryFn: async (): Promise<ActuationLogEntry[]> => {
      if (USE_MOCK_DATA) {
        let data = mockActuationLog;
        if (filters.siteId)
          data = data.filter((e) => e.siteName.toLowerCase().includes(filters.siteId!.toLowerCase()));
        if (filters.verifiedState)
          data = data.filter((e) => e.verifiedState === filters.verifiedState);
        return data;
      }
      const params = new URLSearchParams();
      if (filters.siteId) params.set("siteId", filters.siteId);
      if (filters.verifiedState) params.set("verifiedState", filters.verifiedState);
      return proxyGet<ActuationLogEntry[]>(
        `/api/proxy/actuation-log?${params.toString()}`,
      );
    },
    staleTime: 5_000,
  });
}

// ── Executive Summary V5 ──────────────────────────────────────────────────────

export function useExecutiveSummaryV5() {
  return useQuery({
    queryKey: ["executive-summary-v5"],
    queryFn: async (): Promise<ExecutiveSummaryV5> => {
      if (USE_MOCK_DATA) return mockExecutiveSummary;
      return proxyGet<ExecutiveSummaryV5>("/api/proxy/executive/summary");
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
