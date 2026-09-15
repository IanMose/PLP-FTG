import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * GET /api/proxy/hse-reports/[reportId]
 * Proxies to backend GET /api/hse-reports/{reportId}
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const res = await fetch(`${API_BASE}/api/hse-reports/${reportId}`, {
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
