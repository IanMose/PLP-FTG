import { cn } from "@/lib/utils";
import { CONTROL_MODE, type ControlModeKey } from "@/lib/control-plane/tokens";

interface ControlModeBadgeProps {
  mode: ControlModeKey;
  className?: string;
}

export function ControlModeBadge({ mode, className }: ControlModeBadgeProps) {
  const config = CONTROL_MODE[mode];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
