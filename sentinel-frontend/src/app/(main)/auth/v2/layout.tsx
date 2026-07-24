import type { ReactNode } from "react";

import Image from "next/image";

import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl lg:flex">
          <Image
            src="/login-background.jpg"
            alt="Login background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent" />
          <div className="absolute top-10 z-10 px-10">
            <div className="flex items-center gap-5">
              <Image
                src="/sentinel-logo-v2.png"
                alt="Sentinel Logo"
                width={90}
                height={90}
                className="object-contain rounded-2xl"
              />
              <h1 className="font-bold text-6xl text-white">{APP_CONFIG.name}</h1>
            </div>
            <p className="mt-4 text-xl text-white/90">HSE Early Warning Detection System</p>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
