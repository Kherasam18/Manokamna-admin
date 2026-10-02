"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Product = { _id: string; title: string; brand: string; categoryId: number; price: number; salePrice?: number; stock: number; visible?: boolean }
type Category = { id: number; name: string }

const PAGE_SIZE = 20

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | 'all'>('all')
  const [vis, setVis] = useState<'all' | 'visible' | 'hidden'>('all')
  const [sort, setSort] = useState<'title' | 'price-asc' | 'price-desc' | 'stock-desc'>('title')
  const [discount, setDiscount] = useState<string>('')

  // Debounce search query changes to prevent excessive requests
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
      setSelected({})
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  async function reloadProducts(
    targetPage = page,
    query = q,
    category = cat,
    visibility = vis,
    sortOrder = sort
  ) {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('take', String(PAGE_SIZE))
      params.set('skip', String(Math.max(0, (targetPage - 1) * PAGE_SIZE)))
      if (query.trim()) params.set('q', query.trim())
      if (category !== 'all') params.set('cat', String(category))
      if (visibility !== 'all') params.set('vis', visibility)
      if (sortOrder) params.set('sort', sortOrder)

      const [pRes, cRes] = await Promise.all([
        fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' })
      ])
      const p = await pRes.json().catch(() => ({ items: [], total: 0 }))
      const c = await cRes.json().catch(() => [])
      setItems(p.items || [])
      setTotal(typeof p.total === 'number' ? p.total : (p.items?.length || 0))
      setCats(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadProducts(page, q, cat, vis, sort)
  }, [page, q, cat, vis, sort])

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endItem = Math.min(page * PAGE_SIZE, total)

  const allSelected = useMemo(() => filtered.length > 0 && filtered.every(p => selected[p._id]), [selected, filtered])

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return
    setSelected({})
    setPage(newPage)
  }

  function getPageNumbers(): (number | string)[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | string)[] = [1]
    if (page > 3) pages.push('...')
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Products</h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
            Total: {total}
          </span>
        </div>
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
                  setPage(1)
                  await reloadProducts(1)
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
        <input
          className="input w-64"
          placeholder="Search title or brand"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <select
          className="select"
          value={cat}
          onChange={e => {
            setCat(e.target.value === 'all' ? 'all' : Number(e.target.value))
            setPage(1)
            setSelected({})
          }}
        >
          <option value="all">All categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="select"
          value={vis}
          onChange={e => {
            setVis(e.target.value as any)
            setPage(1)
            setSelected({})
          }}
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          className="select"
          value={sort}
          onChange={e => {
            setSort(e.target.value as any)
            setPage(1)
            setSelected({})
          }}
        >
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
                setToast('Discount applied')
                setSelected({})
                await reloadProducts(page)
              } else {
                setToast('Failed to apply discount')
              }
            }}
          >Apply</button>
          <button
            className="px-3 py-2 rounded border hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            disabled={deleting}
            onClick={async () => {
              const pickIds = filtered.filter(p => selected[p._id]).map(p => p._id)
              const productIds = (allSelected || pickIds.length === 0) ? [] : pickIds
              if (!allSelected && productIds.length === 0) { setToast('Select at least one product'); return }
              if (!confirm(`Delete ${allSelected ? 'ALL on this page' : productIds.length} products?`)) return

              try {
                setDeleting(true)
                const res = await fetch('/api/admin/products/bulk-delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productIds: allSelected ? filtered.map(p => p._id) : productIds })
                })
                const data = await res.json().catch(() => ({}))
                if (res.ok) {
                  setSelected({})
                  const count = data.deletedCount ?? productIds.length
                  setToast(`Deleted ${count} products`)
                  const newTotal = Math.max(0, total - count)
                  const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
                  if (page > newTotalPages) {
                    setPage(newTotalPages)
                  } else {
                    await reloadProducts(page)
                  }
                } else {
                  setToast(data.error || 'Failed to delete products')
                }
              } catch {
                setToast('Failed to delete products')
              } finally {
                setDeleting(false)
              }
            }}
          >{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            No products found matching the criteria.
          </div>
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

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-sm border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-neutral-500 dark:text-neutral-400">
          Showing <span className="font-medium text-neutral-900 dark:text-neutral-100">{startItem}</span> to{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{endItem}</span> of{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{total}</span> products
          {totalPages > 1 && (
            <span className="ml-2 text-xs text-neutral-400">(Page {page} of {totalPages})</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
            disabled={page <= 1 || loading}
            onClick={() => changePage(page - 1)}
          >
            &larr; Previous
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-neutral-400 select-none">
                    …
                  </span>
                )
              }
              const pageNum = Number(p)
              const isActive = pageNum === page
              return (
                <button
                  key={pageNum}
                  className={`min-w-[34px] px-2.5 py-1.5 rounded text-sm transition ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  } disabled:opacity-40`}
                  disabled={loading}
                  onClick={() => changePage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
            disabled={page >= totalPages || loading}
            onClick={() => changePage(page + 1)}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

