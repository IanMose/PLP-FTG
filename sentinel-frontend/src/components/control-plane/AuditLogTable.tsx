"use client";

import { useState } from "react";
import { useActuationLog } from "@/lib/control-plane/api";
import { VerificationBadge } from "./badges/VerificationBadge";
import { ControlModeBadge } from "./badges/ControlModeBadge";
import type { VerifyStateKey, ControlModeKey } from "@/lib/control-plane/tokens";

const VERIFIED_STATE_OPTIONS: { label: string; value: string }[] = [
  { label: "All states", value: "" },
  { label: "Confirmed Closed", value: "CONFIRMED_CLOSED" },
  { label: "Confirmed Open", value: "CONFIRMED_OPEN" },
  { label: "Timeout", value: "TIMEOUT" },
  { label: "Unverified", value: "UNVERIFIED" },
];

export function AuditLogTable() {
  const [siteFilter, setSiteFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const { data: entries = [], isLoading } = useActuationLog({
    siteId: siteFilter || undefined,
    verifiedState: stateFilter || undefined,
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by site…"
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] px-3 py-1.5 text-sm text-[var(--console-text)] placeholder:text-[var(--console-text-dim)] focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] px-3 py-1.5 text-sm text-[var(--console-text)] focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          {VERIFIED_STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-[var(--console-text-dim)] animate-pulse">
          Loading actuation log…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border border-[var(--console-border)] p-8 text-center text-sm text-[var(--console-text-dim)]">
          No actuation records match the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--console-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--console-border)] bg-[var(--console-panel)]">
                {["Time", "Site", "Event", "Mode", "Action", "Verified"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--console-text-dim)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-[var(--console-border)] ${
                    i % 2 === 0 ? "bg-transparent" : "bg-[var(--console-panel)]/40"
                  } hover:bg-white/5 transition-colors`}
                >
                  <td className="tabular-readout px-4 py-2.5 font-mono text-xs text-[var(--console-text-dim)]">
                    {new Date(entry.timestampIso).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--console-text)]">
                    {entry.siteName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--console-text-dim)]">
                    {entry.eventType}
                  </td>
                  <td className="px-4 py-2.5">
                    <ControlModeBadge mode={entry.controlMode as ControlModeKey} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--console-text)]">
                    {entry.actionRequested}
                  </td>
                  <td className="px-4 py-2.5">
                    <VerificationBadge state={entry.verifiedState as VerifyStateKey} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
