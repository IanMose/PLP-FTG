import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

// ── Control Plane header strip ────────────────────────────────────────────────

const LOOP_LABELS = [
  "Sense", "Predict", "Interlock", "Verify", "Learn",
] as const;

const NAV_LINKS = [
  { label: "Tank Monitor", href: "/dashboard/control-plane/tanks" },
  { label: "Interlocks", href: "/dashboard/control-plane/interlocks" },
  { label: "Control Room", href: "/dashboard/control-plane/demo" },
  { label: "Audit Log", href: "/dashboard/control-plane/audit-log" },
] as const;

function ControlPlaneHeader() {
  return (
    <div
      className="border-b px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      style={{
        backgroundColor: "var(--console-panel)",
        borderColor: "var(--console-border)",
      }}
    >
      {/* Identity + loop */}
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck
          className="h-3.5 w-3.5 text-emerald-400 shrink-0"
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--console-text-dim)]">
          KPC HSE Sentinel
        </span>
        <span className="text-[var(--console-border)]">·</span>
        {LOOP_LABELS.map((label, i) => (
          <span key={label} className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[var(--console-text)]">
              {label}
            </span>
            {i < LOOP_LABELS.length - 1 && (
              <ArrowRight className="h-2.5 w-2.5 text-[var(--console-border)]" aria-hidden />
            )}
          </span>
        ))}
      </div>

      {/* Quick-nav links */}
      <nav
        className="flex flex-wrap gap-3"
        aria-label="Control Plane navigation"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[11px] text-[var(--console-text-dim)] hover:text-[var(--console-text)] transition-colors underline-offset-2 hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

// Control Plane layout — applies dark console surface + header strip to all CP pages
export default function ControlPlaneLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-full rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--console-bg)", color: "var(--console-text)" }}
    >
      <ControlPlaneHeader />
      {children}
    </div>
  );
}
