import type { ReactNode } from "react";

// Control Plane layout — inherits theme from parent (light/dark mode aware)
export default function ControlPlaneLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full rounded-lg">
      {children}
    </div>
  );
}
