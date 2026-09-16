import Image from "next/image";

import { APP_CONFIG } from "@/config/app-config";
import { FtgLogo } from "@/components/ftg-logo";

import { LoginForm } from "../../_components/login-form";

export default function LoginV2() {
  return (
    /**
     * Full-screen wrapper — the background image covers the entire viewport.
     * The login card is positioned on the right half so it sits over the dark
     * area of the image, keeping the red wave graphic clearly visible on the left.
     */
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ── Background image ─────────────────────────────────────────────── */}
      <Image
        src="/login-main.png"
        alt=""
        fill
        priority
        quality={90}
        className="object-cover object-left"
        aria-hidden="true"
      />

      {/* ── Subtle dark overlay to deepen contrast over the black area ───── */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* ── Content layer ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-6 md:px-20 lg:px-32">
        {/* Card — frosted glass panel sitting over the dark right portion */}
        <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur-md">

          {/* Logo + app name */}
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/sentinel-logo-v2.png"
              alt="Sentinel Logo"
              width={44}
              height={44}
              className="rounded-xl object-contain"
            />
            <div>
              <h2 className="font-bold text-lg leading-tight text-white">
                {APP_CONFIG.name}
              </h2>
              <p className="text-xs text-white/50">HSE Early Warning Detection System</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-sm text-white/50">
              Sign in to access the control plane.
            </p>
          </div>

          {/* ── Red accent divider matching the image palette ─────────────── */}
          <div className="mb-7 h-px w-12 rounded-full bg-red-500" />

          {/* Login form — inputs inherit white text on dark bg via CSS vars */}
          <div className="[&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-white [&_input]:placeholder:text-white/30 [&_input:focus]:border-red-500/60 [&_input:focus]:ring-red-500/20 [&_label]:text-white/70 [&_button[type=submit]]:bg-red-600 [&_button[type=submit]]:hover:bg-red-500 [&_button[type=submit]]:text-white [&_button[type=submit]]:border-0">
            <LoginForm />
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
            <p className="w-4/5 text-xs leading-relaxed text-white/35">
              Developed by{" "}
              <span className="font-medium text-white/60">FTG</span> — Future •
              Technology • Growth
            </p>
            <div className="w-1/5 flex justify-end opacity-40">
              <FtgLogo className="h-5 w-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Subtle KPC branding watermark bottom-left ─────────────────────── */}
      <div className="absolute bottom-6 left-8 z-10 hidden md:flex items-center gap-2 opacity-30">
        <Image
          src="/kpc-logo.svg"
          alt="KPC"
          width={28}
          height={28}
          className="object-contain brightness-200"
        />
        <span className="text-xs font-medium text-white tracking-widest uppercase">
          Kenya Pipeline Company
        </span>
      </div>
    </div>
  );
}
