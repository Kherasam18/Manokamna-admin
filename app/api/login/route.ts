import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }
  const resp = NextResponse.json({ ok: true, name: data.name, role: data.role })
  // Set admin token cookie (httpOnly when running on prod via middleware)
  resp.cookies.set('admin_token', data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  })
  return resp
}
