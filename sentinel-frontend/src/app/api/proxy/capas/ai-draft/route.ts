import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * POST /api/proxy/capas/ai-draft
 *
 * Forwards AI CAPA draft requests to the backend.
 * Accepts query params: alertId, eventId
 * Accepts optional JSON body: { siteId, description, severity }
 *
 * Returns: { description, rootCause, suggestedActions, aiGenerated }
 */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;

  // Forward query params (alertId, eventId)
  const alertId = req.nextUrl.searchParams.get("alertId");
  const eventId = req.nextUrl.searchParams.get("eventId");

  const params = new URLSearchParams();
  if (alertId) params.set("alertId", alertId);
  if (eventId) params.set("eventId", eventId);

  const body = await req.json().catch(() => null);
  const queryString = params.toString();
  const url = `${API_BASE}/api/capas/ai-draft${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : "{}",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
