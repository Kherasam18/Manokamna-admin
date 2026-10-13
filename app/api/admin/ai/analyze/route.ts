import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

// Forwards product photos to the backend AI reader (which holds the AI API key).
export async function POST(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const form = await req.formData()
  let res: Response
  try {
    res = await fetch(`${base}/api/admin/ai/analyze-product`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form as any
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach the server. Check your connection and try again.' }, { status: 502 })
  }
  const data = await res.json().catch(() => ({ error: `Unexpected response from the server (${res.status})` }))
  return NextResponse.json(data, { status: res.status })
}
