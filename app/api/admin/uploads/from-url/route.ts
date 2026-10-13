import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

// Asks the backend to download an image from a web link and store it as our own image.
export async function POST(req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const body = await req.json().catch(() => ({}))
  let res: Response
  try {
    res = await fetch(`${base}/api/admin/uploads/from-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: body?.url })
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach the server. Check your connection and try again.' }, { status: 502 })
  }
  const data = await res.json().catch(() => ({ error: `Unexpected response from the server (${res.status})` }))
  return NextResponse.json(data, { status: res.status })
}
