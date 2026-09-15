import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function GET(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;
  const { searchParams } = req.nextUrl;
  const params = new URLSearchParams();
  const siteId = searchParams.get("siteId");
  const verifiedState = searchParams.get("verifiedState");
  const limit = searchParams.get("limit");
  if (siteId) params.set("siteId", siteId);
  if (verifiedState) params.set("verifiedState", verifiedState);
  if (limit) params.set("limit", limit);

  const res = await fetch(
    `${API_BASE}/api/actuation-log?${params.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
