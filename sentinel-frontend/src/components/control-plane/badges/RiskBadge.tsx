import { cn } from "@/lib/utils";
import { RISK_BAND, type RiskBandKey } from "@/lib/control-plane/tokens";

interface RiskBadgeProps {
  band: RiskBandKey;
  className?: string;
}

export function RiskBadge({ band, className }: RiskBadgeProps) {
  const config = RISK_BAND[band];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        config.bg,
        config.text,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
