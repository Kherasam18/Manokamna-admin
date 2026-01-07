"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type User = { _id: string; name: string; email: string; mobile: string; blocked: boolean; createdAt: string }

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => { refresh() }, [])

  async function refresh() {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' })
    const data = await res.json().catch(() => ({ items: [], total: 0 }))
    const list = Array.isArray(data) ? data : (data?.items || [])
    setItems(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  const rows = useMemo(() => items, [items])

  async function blockUser(email: string) {
    if (!confirm(`Block user ${email}?`)) return
    await fetch('/api/admin/users/block', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    refresh()
  }

  async function unblockUser(email: string) {
    if (!confirm(`Unblock user ${email}?`)) return
    await fetch('/api/admin/users/unblock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Users</h2>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input className="input w-64" placeholder="Search by name, email, mobile" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-primary" onClick={refresh}>Search</button>
        <button className="btn btn-secondary" onClick={refresh}>Refresh</button>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u._id}>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.mobile}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${u.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 flex gap-2 flex-wrap">
                    <Link className="text-accent underline" href={`/orders?userId=${u._id}`}>Orders</Link>
                    {u.blocked ? (
                      <button className="text-green-600 underline" onClick={() => unblockUser(u.email)}>Unblock</button>
                    ) : (
                      <button className="text-red-600 underline" onClick={() => blockUser(u.email)}>Block</button>
                    )}
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
