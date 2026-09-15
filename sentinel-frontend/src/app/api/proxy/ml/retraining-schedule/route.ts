import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function GET() {
  const token = (await cookies()).get("sentinel-token")?.value;
  const res = await fetch(`${API_BASE}/api/ml/retraining-schedule`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const token = (await cookies()).get("sentinel-token")?.value;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API_BASE}/api/ml/retraining-schedule`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
