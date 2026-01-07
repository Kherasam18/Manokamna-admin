import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('admin_token')?.value || ''
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${base}/api/admin/requested-products/${params.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
