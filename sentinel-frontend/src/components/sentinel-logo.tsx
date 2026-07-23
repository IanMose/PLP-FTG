import { cn } from "@/lib/utils";

interface SentinelLogoProps {
  className?: string;
}

/**
 * Sentinel brand logo — a Roman helmet silhouette in nature green.
 * Conveys protection, vigilance, and the meaning of "sentinel."
 */
export function SentinelLogo({ className }: SentinelLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 text-green-600", className)}
    >
      {/* Helmet dome */}
      <path d="M4 14c0-5 3.5-9 8-9s8 4 8 9" />
      {/* Helmet crest / plume */}
      <path d="M12 2c0 0-2 1.5-2 3s2 3 2 3 2-1.5 2-3-2-3-2-3Z" fill="currentColor" />
      {/* Face guard / visor */}
      <path d="M6 14h12" />
      <path d="M5 14c-1 0-2 1-2 2v1h18v-1c0-1-1-2-2-2" />
      {/* Nose guard */}
      <path d="M10 14v3" />
      <path d="M14 14v3" />
      {/* Cheek guards */}
      <path d="M5 17c0 2 1.5 4 3 5" />
      <path d="M19 17c0 2-1.5 4-3 5" />
    </svg>
  );
}
