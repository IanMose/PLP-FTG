import Link from "next/link";
import { cn } from "@/lib/utils";
import { RISK_BAND } from "@/lib/control-plane/tokens";
import type { TankTelemetry } from "@/lib/control-plane/types";
import { RiskBadge } from "./badges/RiskBadge";
import { TtsCountdown } from "./TtsCountdown";
import { TankLevelGauge } from "./TankLevelGauge";

interface TankCardProps {
  tank: TankTelemetry;
}

export function TankCard({ tank }: TankCardProps) {
  const borderColor = RISK_BAND[tank.riskBand].token;

  return (
    <Link
      href={`/dashboard/control-plane/interlocks?site=${tank.siteId}`}
      className={cn(
        "block rounded-md border transition-colors",
        "bg-card border-border",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-sm font-medium text-foreground">
              {tank.tankId}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {tank.siteName}
            </div>
          </div>
          <RiskBadge band={tank.riskBand} />
        </div>

        {/* Gauge + readouts */}
        <div className="flex items-center gap-4">
          <TankLevelGauge level={tank.level} riskBand={tank.riskBand} />

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Flow</span>
              <span className="tabular-readout font-mono text-foreground">
                {tank.flowRateLpm.toLocaleString()} L/min
              </span>
            </div>
            {tank.levelRateOfChange !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rate</span>
                <span className="tabular-readout font-mono text-foreground">
                  +{tank.levelRateOfChange.toFixed(2)}%/s
                </span>
              </div>
            )}
            <TtsCountdown initialSeconds={tank.timeToUnsafeLevelSec} />
          </div>
        </div>

        {/* Footer */}
        {!tank.loadingActive && (
          <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
            Loading not active
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          Updated{" "}
          {new Date(tank.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>
    </Link>
  );
}
