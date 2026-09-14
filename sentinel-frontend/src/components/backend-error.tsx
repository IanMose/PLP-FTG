import { AlertTriangle, Lock, ServerCrash } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BackendErrorProps {
  /** Human-readable message explaining what failed */
  message: string;
  /**
   * "connection" — backend is unreachable (ECONNREFUSED, timeout).
   * "response"   — backend returned an HTTP error (4xx / 5xx).
   * "auth"       — authentication or authorization issue (401/403).
   * Defaults to "connection".
   */
  kind?: "connection" | "response" | "auth";
}

/**
 * Full-page-width error state for when a backend API call fails.
 * Rendered by dashboard Server Components instead of empty/fake content.
 */
export function BackendError({ message, kind = "connection" }: BackendErrorProps) {
  // Auto-detect auth issues from message
  const isAuth = kind === "auth" || message.includes("403") || message.includes("401");
  const isConnection = kind === "connection" && !isAuth;

  return (
    <Alert variant="destructive" className="my-6">
      {isAuth ? (
        <Lock className="size-4" />
      ) : isConnection ? (
        <ServerCrash className="size-4" />
      ) : (
        <AlertTriangle className="size-4" />
      )}
      <AlertTitle>
        {isAuth ? "Access denied" : isConnection ? "Backend unavailable" : "Failed to load data"}
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-1">
        <p>{message}</p>
        {isAuth && (
          <p className="text-xs opacity-75">
            This page requires authentication. Please{" "}
            <a href="/login" className="underline hover:no-underline">log in</a>{" "}
            with an account that has the <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-xs">ADMIN</code> or{" "}
            <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono text-xs">ML_ADMIN</code> role.
          </p>
        )}
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
