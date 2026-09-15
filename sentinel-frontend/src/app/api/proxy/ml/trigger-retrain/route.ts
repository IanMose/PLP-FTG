import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function POST() {
  const token = (await cookies()).get("sentinel-token")?.value;
  const res = await fetch(`${API_BASE}/api/ml/trigger-retrain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
