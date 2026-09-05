"use client"
import { useEffect, useMemo, useState } from 'react'

type Category = { id: number; name: string; icon?: string | null; visible?: boolean; sort?: number }

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newId, setNewId] = useState<number | ''>('')
  const [newIcon, setNewIcon] = useState('')

  
  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 1800)
      return () => clearTimeout(t)
    }
  }, [toast])

  const sorted = useMemo(() => {
    return [...items].sort((a,b) => (a.sort ?? 0) - (b.sort ?? 0))
  }, [items])

  // function getApiBase() {
  //   const base = process.env.NEXT_PUBLIC_API_BASE || '/'
  //   return base.replace(/\/$/, '/')
  // }

  // function getAdminToken() {
  //   const m = document.cookie.match(/(?:^|; )admin_token=([^;]+)/)
  //   return m ? decodeURIComponent(m[1]) : ''
  // }

  async function refresh() {
    setLoading(true)
    try {
      // const token = getAdminToken()
      // const res = await fetch(`${getApiBase()}api/admin/categories`, {
      //   cache: 'no-store',
      //   headers: { Authorization: token ? `Bearer ${token}` : '' }
            const res = await fetch(`/api/admin/categories`, {
        cache: 'no-store'
      })
      const data = await res.json().catch(() => [])
      // setItems(data)
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function createCategory() {
    setError(null)
    if (!newName.trim() || newId === '') return
    const body = {
      id: typeof newId === 'number' ? newId : Number(newId),
      name: newName.trim(),
      icon: newIcon.trim() ? newIcon.trim() : null
    }
    // const token = getAdminToken()
    // const res = await fetch(`${getApiBase()}api/admin/categories`, {
    const res = await fetch(`/api/admin/categories`, {
      method: 'POST',
      // headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Create failed')
      return
    }
    setNewId(''); setNewName(''); setNewIcon(''); setToast('Category added')
    refresh()
  }

  async function saveRow(c: Category) {
    // const token = getAdminToken()
    // const res = await fetch(`${getApiBase()}api/admin/categories/${c.id}`, {
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: 'PUT',
      // headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, icon: c.icon?.trim() ? c.icon.trim() : null })
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Save failed')
      return
    }
    setToast('Saved')
    refresh()
  }

  async function deleteRow(id: number) {
    if (!confirm('Delete this category?')) return
    // const token = getAdminToken()
    // const res = await fetch(`${getApiBase()}api/admin/categories/${id}`, {
    //   method: 'DELETE',
    //   headers: { Authorization: token ? `Bearer ${token}` : '' }
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Delete failed')
      return
    }
    setToast('Deleted')
    refresh()
  }

  function updateLocal(id: number, patch: Partial<Category>) {
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Categories</h2>
      {toast && <div className="px-3 py-2 rounded bg-green-600 text-white text-sm">{toast}</div>}
      {error && <div className="px-3 py-2 rounded bg-red-600 text-white text-sm">{error}</div>}
      <div className="p-4 border rounded-lg border-neutral-200 dark:border-neutral-800">
        <div className="text-sm font-medium mb-2">Add Category</div>
        <div className="flex gap-2 flex-wrap">
          <input className="input w-32" placeholder="ID (number)" type="number" value={newId} onChange={e => setNewId(e.target.value === '' ? '' : Number(e.target.value))} />
          <input className="input w-80" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="input w-[28rem]" placeholder="Image URL (optional)" value={newIcon} onChange={e => setNewIcon(e.target.value)} />
          <button className="btn btn-primary" onClick={createCategory}>Add</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Image</th>
                <th className="text-left p-3">Visible</th>
                <th className="text-left p-3">Sort</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="p-3">{c.id}</td>
                  <td className="p-3">
                    <input className="input w-64" value={c.name} onChange={e => updateLocal(c.id, { name: e.target.value })} />
                  </td>
                  <td className="p-3">
                    <input className="input w-[28rem]" placeholder="Image URL (optional)" value={c.icon ?? ''} onChange={e => updateLocal(c.id, { icon: e.target.value })} />
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={c.visible ?? true} onChange={e => updateLocal(c.id, { visible: e.target.checked })} />
                      <span>{(c.visible ?? true) ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </td>
                  <td className="p-3">
                    <input className="input w-24" type="number" value={c.sort ?? 0} onChange={e => updateLocal(c.id, { sort: Number(e.target.value) })} />
                  </td>
                  <td className="p-3 space-x-2">
                    <button className="px-2 py-1 rounded border" onClick={() => saveRow(c)}>Save</button>
                    <button className="px-2 py-1 rounded border border-red-600 text-red-600" onClick={() => deleteRow(c.id)}>Delete</button>
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
