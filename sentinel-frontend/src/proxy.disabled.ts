// Rename this file to `proxy.ts` to enable it as Next.js middleware.
import { type NextRequest, NextResponse } from "next/server";

export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

// Runs for all routes.
export const config = {
  matcher: "/:path*",
};
