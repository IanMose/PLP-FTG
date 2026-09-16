import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * POST /api/proxy/ai-chat
 * Body: { question: string }
 * Proxies to backend POST /api/ai/chat
 */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ answer: "Could not get a response. Try again." }));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
