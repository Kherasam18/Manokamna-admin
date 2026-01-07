import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export async function GET(_req: NextRequest) {
  const token = cookies().get('admin_token')?.value || ''
  const res = await fetch(`${base}/api/admin/orders/export.csv`, { headers: { Authorization: `Bearer ${token}` } })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="orders.csv"'
    }
  })
}
