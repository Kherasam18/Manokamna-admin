import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('admin_token')?.value || ''
  const url = new URL(req.url)
  const res = await fetch(`${base}/api/admin/users/${params.id}/orders${url.search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ({ items: [], total: 0 }))
  return NextResponse.json(data, { status: res.status })
}
