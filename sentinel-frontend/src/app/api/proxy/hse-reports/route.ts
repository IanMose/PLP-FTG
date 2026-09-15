import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * GET  /api/proxy/hse-reports?status=DRAFT
 * POST not needed here — list endpoint only
 */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const url = status
    ? `${API_BASE}/api/hse-reports?status=${status}`
    : `${API_BASE}/api/hse-reports`;

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
