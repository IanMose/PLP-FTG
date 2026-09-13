import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  open:        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  verified:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  closed:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function CapaStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize", styles[status] ?? styles.open)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const STEPS = ["open", "in_progress", "completed", "verified", "closed"];

export function CapaStatusStepper({ status }: { status: string }) {
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-bold border-2",
            i < currentIdx ? "border-green-500 bg-green-500 text-white" :
            i === currentIdx ? "border-primary bg-primary text-primary-foreground" :
            "border-muted-foreground/30 text-muted-foreground"
          )}>
            {i < currentIdx ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-0.5 w-6", i < currentIdx ? "bg-green-500" : "bg-muted-foreground/20")} />
          )}
        </div>
      ))}
    </div>
  );
}
