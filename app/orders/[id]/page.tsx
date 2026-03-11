"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Admin can mark operational states: pending, delivered, recheck
const statuses = ['pending','delivered','recheck'] as const

type Line = { productId?: { _id: string; title: string; price: number } | string; qty: number; price: number }

type Order = {
  _id: string
  createdAt: string
  status: (typeof statuses)[number]
  amount: number
  userId?: { _id?: string; name?: string; email?: string; mobile?: string }
  items: Line[]
  addressSnapshot?: any
  gstNumber?: string
  paymentMethod?: string | null
}

async function fetchOrder(id: string) {
  const res = await fetch(`/api/admin/orders/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

async function updateStatus(id: string, status: string) {
  const res = await fetch(`/api/admin/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || 'Update failed')
  }
  return res.json()
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = useMemo(() => (params?.id as string) || '', [params])
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { reload() }, [id])

  async function reload() {
    setLoading(true)
    setError(null)
    try { setOrder(await fetchOrder(id)) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 1800); return () => clearTimeout(t) } }, [toast])

  const onChangeStatus = async (next: string) => {
    try {
      setSaving(true)
      await updateStatus(id, next)
      setToast('Status updated')
      await reload()
    } catch (e: any) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-4">Loading…</div>
  if (!order) return <div className="p-4">Not found</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Order {order._id}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm">Status</span>
          <select className="border px-3 py-2 rounded bg-black text-white" value={order.status} disabled={saving} onChange={e => onChangeStatus(e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="px-3 py-2 rounded border" onClick={() => router.back()}>Back</button>
        </div>
      </div>
      {toast && <div className="px-3 py-2 rounded bg-green-600 text-white text-sm">{toast}</div>}
      {error && <div className="px-3 py-2 rounded bg-red-600 text-white text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg border-neutral-200 dark:border-neutral-800 md:col-span-2">
          <div className="text-sm font-medium mb-2">Items</div>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((li, idx) => {
                const anyLi: any = li as any
                const prod: any = anyLi.productId && typeof anyLi.productId === 'object' ? anyLi.productId : null
                const brand = (prod?.brand || anyLi?.brand || '') as string
                // Prefer actual names and snapshots; do NOT fall back to primitive productId (to avoid showing ids)
                const pnameRaw = (prod?.name || prod?.title || anyLi?.name || anyLi?.title || '') as string
                const pname = String(pnameRaw || '').trim() || '-'
                                const sizeRaw = (anyLi?.variantSize || anyLi?.size || anyLi?.variant || '') as string
                const size = String(sizeRaw || '').trim()
                const productLabel = brand ? `${brand} • ${pname}` : pname
                const productLabelWithSize = size ? `${productLabel} • ${size}` : productLabel
                return (
                  <tr key={idx} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="p-2">{productLabelWithSize}</td>
                    <td className="p-2">{li.qty}</td>
                    <td className="p-2">₹{li.price}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border rounded-lg border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="text-sm font-medium">Summary</div>
          <div className="text-sm">Customer: {order.userId?.name ?? '-'}</div>
          <div className="text-sm">Mobile: {(order.userId as any)?.mobile ?? '-'}</div>
          <div className="text-sm">Email: {order.userId?.email ?? '-'}</div>
          <div className="text-sm">Customer ID: {order.userId?._id ?? '-'}</div>
          <div className="text-sm">Amount: ₹{order.amount}</div>
          <div className="text-sm">Date: {new Date(order.createdAt).toLocaleString()}</div>
          <div className="text-sm">Status: {order.status}</div>
          {order.gstNumber && <div className="text-sm">GST Number: {order.gstNumber}</div>}
          <div className="text-sm">Payment: {order.paymentMethod === 'paid_upi' ? 'Paid by UPI' : order.paymentMethod === 'paid_card' ? 'Paid by Card' : 'COD'}</div>
          <div className="text-sm">
            Address: {(() => {
              const a: any = order.addressSnapshot || {}
              if (typeof a === 'string') return a || '-'
              const street = a.street || a.street1 || a.address1 || a.line1 || a.house || ''
              const area = a.area || a.locality || a.line2 || a.neighborhood || ''
              const landmark = a.landmark || a.near || ''
              const city = a.city || a.town || ''
              const state = a.state || a.region || ''
              const pin = a.pincode || a.pin || a.postalCode || a.zip || ''
              const parts = [street, area, landmark, city, state, pin].filter((v) => v !== undefined && v !== null && String(v).trim().length > 0)
              return parts.length ? parts.join(', ') : '-'
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
