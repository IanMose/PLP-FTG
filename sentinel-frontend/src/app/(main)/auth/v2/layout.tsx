import type { ReactNode } from "react";

import Image from "next/image";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        {/* ── Side photo panel ─────────────────────────────────────────── */}
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl lg:flex">
          <Image
            src="/login-background.jpg"
            alt="Login background"
            fill
            className="object-cover"
            priority
          />

          {/* Gradient overlay — darkens bottom-left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* ── Bottom overlay: ribbon + HSE text side by side ── */}
          <div className="absolute bottom-10 left-10 z-10 flex items-end gap-5">

            {/* Red ribbon — rotated 180° so the point faces UP */}
            <div className="relative shrink-0 rotate-180">
              <svg
                width="80"
                height="110"
                viewBox="0 0 80 110"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-xl"
              >
                {/* Ribbon body with V-notch at bottom */}
                <path
                  d="M0 0 H80 V90 L40 110 L0 90 Z"
                  fill="#CC3131"
                />
                {/* Top sheen */}
                <path
                  d="M0 0 H80 V48 Q40 40 0 48 Z"
                  fill="white"
                  fillOpacity="0.07"
                />
              </svg>

              {/* Logo counter-rotated so it appears upright on the ribbon */}
              <div className="absolute inset-0 flex items-start justify-center pt-4 rotate-180">
                <Image
                  src="/sentinel-logo-v2.png"
                  alt="Sentinel"
                  width={40}
                  height={40}
                  className="object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* HSE text block */}
            <div className="space-y-1 pb-1">
              <div className="mb-3 h-0.5 w-10 rounded-full bg-white/70" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                HSE
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
                Early Warning
                <br />
                Detection System
              </h2>
              <p className="pt-2 text-sm text-white/50">
                Real-time pipeline safety monitoring
              </p>
            </div>
          </div>
        </div>

        {/* ── Login form panel ─────────────────────────────────────────── */}
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
