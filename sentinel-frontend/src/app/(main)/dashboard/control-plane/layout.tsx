import type { ReactNode } from "react";

// Control Plane layout — applies dark console surface to all CP pages
export default function ControlPlaneLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-full rounded-lg"
      style={{ backgroundColor: "var(--console-bg)", color: "var(--console-text)" }}
    >
      {children}
    </div>
  );
}
