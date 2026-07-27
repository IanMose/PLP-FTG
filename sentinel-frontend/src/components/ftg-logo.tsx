import { cn } from "@/lib/utils";

interface FtgLogoProps {
  className?: string;
}

export function FtgLogo({ className }: FtgLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 80"
      className={cn("h-8 w-auto", className)}
      aria-label="FTG - Future Technology Growth"
    >
      {/* F letter - dark */}
      <path
        d="M5 70V10h45v12H22v14h25v12H22v22H5z"
        fill="currentColor"
        className="text-gray-900 dark:text-gray-100"
      />
      {/* T letter - dark, shares crossbar with F */}
      <path
        d="M55 10h55v12H100v48H83V22H55V10z"
        fill="currentColor"
        className="text-gray-900 dark:text-gray-100"
      />
      {/* G letter - blue */}
      <path
        d="M130 10h60v12h-50v36h38V46h-18v-12h35v36h-65V10z"
        fill="#2563eb"
      />
      {/* Dots and tagline */}
      <text
        x="100"
        y="78"
        textAnchor="middle"
        fontSize="6"
        fontFamily="system-ui, sans-serif"
        letterSpacing="2"
        fill="#2563eb"
      >
        FUTURE • TECHNOLOGY • GROWTH
      </text>
    </svg>
  );
}
