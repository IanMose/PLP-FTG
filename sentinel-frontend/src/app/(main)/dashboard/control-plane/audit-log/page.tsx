"use client";

import { AuditLogTable } from "@/components/control-plane/AuditLogTable";
import Link from "next/link";

export default function AuditLogPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Actuation &amp; Verification Log
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Every interlock actuation with its verified state — the audit trail for HSE compliance.
        </p>
      </div>

      <AuditLogTable />

      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        Records are retained for 365 days per data retention policy.{" "}
        <Link
          href="/dashboard/control-plane/tanks"
          className="underline underline-offset-2 hover:text-foreground"
        >
          ← Back to Tank Monitor
        </Link>
      </div>
    </div>
  );
}
