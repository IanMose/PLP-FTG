import { AlertTriangle, ServerCrash } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BackendErrorProps {
  /** Human-readable message explaining what failed */
  message: string;
  /**
   * "connection" — backend is unreachable (ECONNREFUSED, timeout).
   * "response"   — backend returned an HTTP error (4xx / 5xx).
   * Defaults to "connection".
   */
  kind?: "connection" | "response";
}

/**
 * Full-page-width error state for when a backend API call fails.
 * Rendered by dashboard Server Components instead of empty/fake content.
 */
export function BackendError({ message, kind = "connection" }: BackendErrorProps) {
  const isConnection = kind === "connection";

  return (
    <Alert variant="destructive" className="my-6">
      {isConnection ? (
        <ServerCrash className="size-4" />
      ) : (
        <AlertTriangle className="size-4" />
      )}
      <AlertTitle>
        {isConnection ? "Backend unavailable" : "Failed to load data"}
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-1">
        <p>{message}</p>
        {isConnection && (
          <p className="text-xs opacity-75">
            Make sure the Sentinel backend is running on{" "}
            <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-xs">
              {process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "http://localhost:8080"}
            </code>{" "}
            and that <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_SENTINEL_API_URL</code> is
            set in <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-xs">.env.local</code>.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
