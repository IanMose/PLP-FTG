import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/**
 * POST /api/proxy/ai-language
 * Body: { language: "en" | "sw" }
 * Proxies to backend POST /api/ai/language
 */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${API_BASE}/api/ai/language`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ success: false }));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

/**
 * GET /api/proxy/ai-language
 * Returns the current active language from the backend.
 */
export async function GET() {
  const token = ((await cookies()).get("sentinel-token"))?.value;

  const res = await fetch(`${API_BASE}/api/ai/language`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ language: "en" }));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
