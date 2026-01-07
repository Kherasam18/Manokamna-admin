"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Product = { _id: string; title: string; brand: string; categoryId: number; price: number; salePrice?: number; stock: number; visible?: boolean }
type Category = { id: number; name: string }

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | 'all'>('all')
  const [vis, setVis] = useState<'all' | 'visible' | 'hidden'>('all')
  const [sort, setSort] = useState<'title' | 'price-asc' | 'price-desc' | 'stock-desc'>('title')
  const [discount, setDiscount] = useState<string>('')

  async function reloadProducts() {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' })
      ])
      const p = await pRes.json().catch(() => ({ items: [] }))
      const c = await cRes.json().catch(() => [])
      setItems(p.items || [])
      setCats(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!mounted) return
        await reloadProducts()
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 1800)
      return () => clearTimeout(t)
    }
  }, [toast])

  const filtered = useMemo(() => {
    let list = items
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(p => `${p.title} ${p.brand}`.toLowerCase().includes(s))
    }
    if (cat !== 'all') list = list.filter(p => p.categoryId === cat)
    if (vis !== 'all') list = list.filter(p => (vis === 'visible' ? (p.visible ?? true) : !(p.visible ?? true)))
    switch (sort) {
      case 'price-asc': list = [...list].sort((a,b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break
      case 'price-desc': list = [...list].sort((a,b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break
      case 'stock-desc': list = [...list].sort((a,b) => (b.stock) - (a.stock)); break
      default: list = [...list].sort((a,b) => a.title.localeCompare(b.title))
    }
    return list
  }, [items, q, cat, vis, sort])

  const allSelected = useMemo(() => filtered.length > 0 && filtered.every(p => selected[p._id]), [selected, filtered])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="flex items-center gap-2">
          <Link href="/products/new" className="px-3 py-2 rounded bg-black text-white hover:opacity-90">New Product</Link>
          <label className="px-3 py-2 rounded border cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? file.name : 'Choose CSV'}
          </label>
          <button
            className="px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
            disabled={!file || importing}
            onClick={async () => {
              if (!file) return
              try {
                setImporting(true)
                const fd = new FormData()
                fd.append('file', file)
                const res = await fetch('/api/admin/products/import', { method: 'POST', body: fd })
                const data = await res.json().catch(() => ({}))
                if (res.ok) {
                  setToast(`Imported: ${data.created || 0}, Updated: ${data.updated || 0}`)
                  setFile(null)
                  await reloadProducts()
                } else {
                  setToast(data.error || 'Import failed')
                }
              } catch {
                setToast('Import failed')
              } finally {
                setImporting(false)
              }
            }}
          >{importing ? 'Importing…' : 'Import CSV'}</button>
        </div>
      </div>
      {toast && <div className="px-3 py-2 rounded bg-green-600 text-white text-sm">{toast}</div>}
      <div className="flex gap-2 flex-wrap items-center">
        <input className="input w-64" placeholder="Search title or brand" value={q} onChange={e => setQ(e.target.value)} />
        <select className="select" value={cat} onChange={e => setCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={vis} onChange={e => setVis(e.target.value as any)}>
          <option value="all">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <select className="select" value={sort} onChange={e => setSort(e.target.value as any)}>
          <option value="title">Title A→Z</option>
          <option value="price-asc">Price Low→High</option>
          <option value="price-desc">Price High→Low</option>
          <option value="stock-desc">Stock High→Low</option>
        </select>
        <div className="flex items-center gap-2">
          <input className="input w-36" placeholder="Give Discount (%)" value={discount} onChange={e => setDiscount(e.target.value)} />
          <button
            className="px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
            disabled={!discount.trim() || isNaN(Number(discount))}
            onClick={async () => {
              const pct = Number(discount)
              const pickIds = filtered.filter(p => selected[p._id]).map(p => p._id)
              const productIds = (allSelected || pickIds.length === 0) ? [] : pickIds
              if (!allSelected && productIds.length === 0) { setToast('Select at least one product'); return }
              const res = await fetch('/api/admin/products/discount', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds, discountPercentage: pct })
              })
              if (res.ok) {
                const data = await res.json().catch(() => ({ items: [] }))
                // Merge updated items into current list
                const map = new Map<string, Product>(items.map(i => [i._id, i]))
                for (const u of data.items || []) map.set(u._id, u)
                setItems(Array.from(map.values()))
                setSelected({})
                setToast('Discount applied')
              } else {
                setToast('Failed to apply discount')
              }
            }}
          >Apply</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Loading…</div>
        ) : (
          <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <thead className="bg-neutral-50 dark:bg-neutral-900/40">
              <tr>
                <th className="text-left p-3">
                  <input type="checkbox" checked={allSelected} onChange={e => {
                    const value = e.target.checked
                    const next: Record<string, boolean> = {}
                    if (value) filtered.forEach(p => { next[p._id] = true })
                    setSelected(next)
                  }} />
                </th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Brand</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Visible</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p._id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="p-3"><input type="checkbox" checked={!!selected[p._id]} onChange={e => setSelected(prev => ({ ...prev, [p._id]: e.target.checked }))} /></td>
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{p.brand}</td>
                  <td className="p-3">{cats.find(c => c.id === p.categoryId)?.name ?? p.categoryId}</td>
                  <td className="p-3">₹{p.salePrice ?? p.price}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">{(p.visible ?? true) ? 'Yes' : 'No'}</td>
                  <td className="p-3">
                    <Link href={`/products/${p._id}`} className="text-accent underline">Edit</Link>
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
