import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; ruleType: string }> },
) {
  const { siteId, ruleType } = await params;
  const token = (await cookies()).get("sentinel-token")?.value;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(
    `${API_BASE}/api/interlock/rules/${siteId}/${ruleType}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
