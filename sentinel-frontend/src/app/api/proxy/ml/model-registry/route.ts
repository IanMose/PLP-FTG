import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function GET() {
  const token = (await cookies()).get("sentinel-token")?.value;
  const res = await fetch(`${API_BASE}/api/ml/model-registry`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
