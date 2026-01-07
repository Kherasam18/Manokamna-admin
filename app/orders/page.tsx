"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Order = { _id: string; createdAt: string; status: string; amount: number; userId?: { name?: string; email?: string; mobile?: string } ; items?: any[] }

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'pending' | 'delivered' | 'recheck' | 'cod' | 'paid_upi' | 'paid_card'>('all')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => { refresh() }, [])

  async function refresh() {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json().catch(() => ({ items: [], total: 0 }))
    setItems(data.items || [])
    setLoading(false)
  }

  const rows = useMemo(() => items, [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Orders</h2>
        <a href="/api/admin/orders/export" className="px-3 py-2 rounded border">Export CSV</a>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input className="input w-64" placeholder="Search by order id or user email" value={q} onChange={e => setQ(e.target.value)} />
        <select className="select" value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="recheck">Recheck</option>
          <option value="cod">COD</option>
          <option value="paid_upi">Paid by UPI</option>
          <option value="paid_card">Paid by Card</option>
        </select>
        <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        <button className="btn btn-primary" onClick={refresh}>Apply</button>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                <th className="text-left p-3">Order ID</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Mobile</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const name = o.userId?.name || '-'
                const mobile = (o.userId as any)?.mobile || '-'
                return (
                  <tr key={o._id} className="border-top border-neutral-200 dark:border-neutral-800">
                    <td className="p-3">{o._id}</td>
                    <td className="p-3">{name}</td>
                    <td className="p-3">{mobile}</td>
                    <td className="p-3">{o.status}</td>
                    <td className="p-3">₹{o.amount}</td>
                    <td className="p-3">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="p-3"><Link href={`/orders/${o._id}`} className="text-accent underline">View</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
