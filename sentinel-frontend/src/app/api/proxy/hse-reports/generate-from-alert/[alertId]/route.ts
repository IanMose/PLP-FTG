import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * POST /api/proxy/hse-reports/generate-from-alert/[alertId]
 * Proxies to backend POST /api/hse-reports/generate-from-alert/{alertId}
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;
  const token = (await cookies()).get("sentinel-token")?.value;

  const res = await fetch(
    `${API_BASE}/api/hse-reports/generate-from-alert/${alertId}`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
