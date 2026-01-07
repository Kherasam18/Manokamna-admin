import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function GET(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const res = await fetch(`${base}/api/admin/requested-products`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ([]))
  return NextResponse.json(data, { status: res.status })
}
