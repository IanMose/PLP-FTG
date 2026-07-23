import type { ReactNode } from "react";

import Image from "next/image";

import { ShieldAlert } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl bg-neutral-950 lg:flex lg:items-center lg:justify-center">
          <Image
            src="/sentinel-hero.svg"
            alt="Sentinel — Data quality monitoring system"
            width={500}
            height={500}
            className="size-[80%] object-contain"
            priority
          />
          <div className="absolute top-10 space-y-1 px-10 text-white">
            <ShieldAlert className="size-10" />
            <h1 className="font-medium text-2xl">Sentinel</h1>
            <p className="text-sm text-white/70">Data Quality & Risk Monitoring Platform</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-white">
              <h2 className="font-medium">Real-time monitoring</h2>
              <p className="text-sm text-white/70">Track data quality, risk scores, and alerts across all sites in one dashboard.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-white">
              <h2 className="font-medium">Traceable decisions</h2>
              <p className="text-sm text-white/70">
                Every record is routed, scored, and explained — full auditability from ingestion to insight.
              </p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
