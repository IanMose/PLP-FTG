import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * POST /api/proxy/hse-reports/generate/[eventId]
 * Proxies to backend POST /api/hse-reports/generate/{eventId}
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const res = await fetch(`${API_BASE}/api/hse-reports/generate/${eventId}`, {
    method: "POST",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
