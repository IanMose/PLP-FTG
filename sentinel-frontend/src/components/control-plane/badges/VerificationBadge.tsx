// SAFETY-CRITICAL COMPONENT
// The colour mapping here is tested in VerificationBadge.test.tsx.
// NEVER use --verify-success for UNVERIFIED or TIMEOUT states.
// Any change to this file must re-run the test suite.

import { cn } from "@/lib/utils";
import { VERIFY_STATE, type VerifyStateKey } from "@/lib/control-plane/tokens";

interface VerificationBadgeProps {
  state: VerifyStateKey;
  className?: string;
}

export function VerificationBadge({ state, className }: VerificationBadgeProps) {
  const config = VERIFY_STATE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.pulse && "verify-pending",
        className,
      )}
      data-verify-state={state}
      data-verify-token={config.token}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.token }}
        aria-hidden
      />
      {config.label}
    </span>
  );
}
