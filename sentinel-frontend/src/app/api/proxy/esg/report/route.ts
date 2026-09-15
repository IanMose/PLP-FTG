import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * GET /api/proxy/esg/report?period=30d|90d|365d
 * Proxies to backend GET /api/esg/report
 * No auth required — ESG report is board-facing, publicly readable.
 */
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "30d";

  const res = await fetch(`${API_BASE}/api/esg/report?period=${period}`, {
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
