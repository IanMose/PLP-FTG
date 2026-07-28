import type { ReactNode } from "react";

import Image from "next/image";

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

          {/* KPC badge overlay — bottom right */}
          <div className="absolute bottom-8 right-0 z-10">
            <div className="relative rotate-180">
              {/* Bookmark/ribbon shape */}
              <svg
                width="140"
                height="180"
                viewBox="0 0 140 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-lg"
              >
                <path
                  d="M0 20C0 8.954 8.954 0 20 0h100c11.046 0 20 8.954 20 20v130c0 16.569-13.431 30-30 30H20c-11.046 0-20-8.954-20-20V20Z"
                  fill="#CC3131"
                />
                {/* Curled edge details */}
                <path
                  d="M0 10c0-5.523 4.477-10 10-10h2v6c0 2.21-1.79 4-4 4H0v0Z"
                  fill="#8B1F1F"
                />
                <path
                  d="M0 170c0 5.523 4.477 10 10 10h2v-6c0-2.21-1.79-4-4-4H0v0Z"
                  fill="#8B1F1F"
                />
              </svg>
              {/* KPC logo inside the ribbon (counter-rotated so it appears upright) */}
              <div className="absolute inset-0 flex items-center justify-center rotate-180" />
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
