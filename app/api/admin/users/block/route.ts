import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function PUT(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const { pathname } = new URL(req.url)
  const action = pathname.endsWith('/block') ? '/users/block' : pathname.endsWith('/unblock') ? '/users/unblock' : null
  if (!action) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${base}/api/admin${action}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
