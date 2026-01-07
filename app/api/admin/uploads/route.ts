import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const form = await req.formData()
  const res = await fetch(`${base}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form as any
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
