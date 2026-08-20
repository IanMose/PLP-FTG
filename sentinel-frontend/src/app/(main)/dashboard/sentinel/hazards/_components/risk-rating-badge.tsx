import { cn } from "@/lib/utils";

export function RiskRatingBadge({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined)
    return <span className="text-muted-foreground text-xs">—</span>;

  const { label, className } =
    rating >= 15 ? { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" } :
    rating >= 10 ? { label: "High",     className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" } :
    rating >= 5  ? { label: "Medium",   className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" } :
                   { label: "Low",      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", className)}>
      {rating}/25 · {label}
    </span>
  );
}

export function HazardStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open:             "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    risk_assessed:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    linked_to_alert:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    closed:           "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize", styles[status] ?? styles.open)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
