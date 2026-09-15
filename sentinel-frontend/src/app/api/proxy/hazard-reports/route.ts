import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? ''

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sentinel-token')?.value
  const body = await req.json()
  
  const res = await fetch(`${API_BASE}/api/hazard-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
