"use client";

type ProvenanceType = "COURT_RECORD" | "ESTIMATE" | "SYNTHETIC" | "PIPELINE_DATA";

const styles: Record<ProvenanceType, { label: string; className: string }> = {
  COURT_RECORD:  { label: "COURT RECORD",  className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  ESTIMATE:      { label: "ESTIMATE",      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  SYNTHETIC:     { label: "SYNTHETIC",     className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  PIPELINE_DATA: { label: "LIVE DATA",     className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

export function ProvenanceBadge({ type }: { type: ProvenanceType }) {
  const { label, className } = styles[type] ?? styles.ESTIMATE;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}
