import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? ''

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('sentinel-token')?.value
  
  const res = await fetch(`${API_BASE}/api/capas/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
