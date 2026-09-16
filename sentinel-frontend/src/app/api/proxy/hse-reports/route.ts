import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function GET(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const url = status
    ? `${API_BASE}/api/hse-reports?status=${status}`
    : `${API_BASE}/api/hse-reports`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
