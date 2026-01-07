import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

  // Proxy as multipart to backend
  const b = new FormData()
  b.append('file', file)
  const res = await fetch(`${base}/api/admin/products/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: b as any
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
