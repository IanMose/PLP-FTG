import Image from "next/image";

import { cn } from "@/lib/utils";

interface SentinelLogoProps {
  className?: string;
}

export function SentinelLogo({ className }: SentinelLogoProps) {
  return (
    <Image
      src="/sentinel-logo-v2.png"
      alt="Sentinel Logo"
      width={40}
      height={40}
      className={cn("size-4 object-contain", className)}
    />
  );
}
