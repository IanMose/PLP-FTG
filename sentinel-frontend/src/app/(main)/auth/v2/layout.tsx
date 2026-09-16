import type { ReactNode } from "react";

/**
 * Auth v2 layout — pass children straight through.
 * The login page itself owns the full-screen background treatment.
 */
export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
