import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function GET(_req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const res = await fetch(`${base}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ([]))
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${base}/api/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
