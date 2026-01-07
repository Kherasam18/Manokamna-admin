"use client"
import { useEffect, useState } from 'react'

type Item = { _id: string; brand: string; name: string; checked?: boolean; createdAt: string; userId?: { name?: string; email?: string } }

export default function RequestedProductsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/requested-products', { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function markChecked(id: string) {
    const res = await fetch(`/api/admin/requested-products/${id}/check`, { method: 'PUT' })
    if (res.ok) await load()
  }

  async function updateStatus(id: string, status: 'pending'|'arrived') {
    const res = await fetch(`/api/admin/requested-products/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) await load()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Requested Products</h2>
      {error && <div className="px-3 py-2 rounded bg-red-600 text-white text-sm">{error}</div>}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Brand</th>
                <th className="text-left p-3">Product Name</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it._id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="p-3">{new Date(it.createdAt).toLocaleString()}</td>
                  <td className="p-3">{it.brand}</td>
                  <td className="p-3">{it.name}</td>
                  <td className="p-3">{it.userId?.name || it.userId?.email || '-'}</td>
                  <td className="p-3">
                    <select
                      className="border px-2 py-1 rounded bg-black text-white"
                      value={it.checked ? 'arrived' : 'pending'}
                      onChange={(e) => updateStatus(it._id, e.target.value as 'pending'|'arrived')}
                    >
                      <option value="pending">pending</option>
                      <option value="arrived">arrived</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
