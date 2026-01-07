import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('admin_token')?.value || ''
  const res = await fetch(`${base}/api/admin/requested-products/${params.id}/check`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
