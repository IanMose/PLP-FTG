/**
 * ControlPlaneHeroBanner
 *
 * Sticky top-of-page banner for the Sentinel Overview that surfaces the
 * system's core value proposition: Predict → Interlock → Prevent → Learn.
 * Intentionally lightweight — no data fetching, pure presentation.
 */

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

interface ControlPlaneHeroBannerProps {
  /** Derived from executive summary — shows how many overfill events were stopped */
  overfillEventsPrevented?: number;
  /** Average response time in seconds */
  avgResponseTimeSec?: number;
}

const STEPS = [
  { key: "SENSE",     label: "Sense",     color: "text-sky-400" },
  { key: "PREDICT",   label: "Predict",   color: "text-amber-400" },
  { key: "INTERLOCK", label: "Interlock", color: "text-orange-400" },
  { key: "VERIFY",    label: "Verify",    color: "text-emerald-400" },
  { key: "LEARN",     label: "Learn",     color: "text-purple-400" },
] as const;

export function ControlPlaneHeroBanner({
  overfillEventsPrevented = 0,
  avgResponseTimeSec = 0,
}: ControlPlaneHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0b1215] px-6 py-5 shadow-lg">
      {/* Background gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 50%, #ea580c33 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: system identity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#7c9099]">
              KPC HSE Sentinel — Autonomous Control Plane
            </span>
          </div>

          {/* Safety loop steps */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STEPS.map((step, i) => (
              <span key={step.key} className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold ${step.color}`}>
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    className="h-3 w-3 text-[#1f2b30]"
                    aria-hidden
                  />
                )}
              </span>
            ))}
          </div>

          <p className="text-xs text-[#7c9099] max-w-md">
            Real-time spill &amp; overfill prevention — from tank telemetry to verified
            interlock action in seconds.
          </p>
        </div>

        {/* Right: live KPIs + CTA */}
        <div className="flex flex-wrap items-center gap-4">
          {overfillEventsPrevented > 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-center">
              <div className="text-2xl font-bold tabular-nums text-emerald-400">
                {overfillEventsPrevented}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/70">
                Overfills Prevented
              </div>
            </div>
          )}

          {avgResponseTimeSec > 0 && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-2.5 text-center">
              <div className="text-2xl font-bold tabular-nums text-sky-400">
                {avgResponseTimeSec.toFixed(1)}s
              </div>
              <div className="text-[10px] uppercase tracking-wider text-sky-400/70">
                Avg Response
              </div>
            </div>
          )}

          <Link
            href="/dashboard/control-plane/tanks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            Open Control Plane
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
