"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

async function fetchProduct(id: string) {
  const res = await fetch(`/api/admin/products/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

async function fetchCategories() {
  const res = await fetch('/api/admin/categories', { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/admin/uploads', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.url as string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = useMemo(() => (params?.id as string) || '', [params])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [cats, setCats] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [price, setPrice] = useState<number | ''>('')
  const [salePrice, setSalePrice] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>('')
  const [itemsLeft, setItemsLeft] = useState<number | ''>('')
  const [daysLeftInExpiry, setDaysLeftInExpiry] = useState<number | ''>('')
  const [images, setImages] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [visible, setVisible] = useState<boolean>(true)
  const [bestSeller, setBestSeller] = useState<'yes' | 'no'>('no')
  const [variants, setVariants] = useState<Array<{ size: string; price: number | ''; image?: string }>>([])
  const [baseSize, setBaseSize] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [p, categories] = await Promise.all([fetchProduct(id), fetchCategories()])
        if (!mounted) return
        setCats(categories)
        setTitle(p.title)
        setDescription(p.description)
        setBrand(p.brand)
        setCategoryId(p.categoryId)
        setPrice(p.price)
        setSalePrice(p.salePrice ?? '')
        setStock(p.stock ?? 0)
        setItemsLeft(typeof p.itemsLeft === 'number' ? p.itemsLeft : '')
        setDaysLeftInExpiry(typeof p.daysLeftInExpiry === 'number' ? p.daysLeftInExpiry : '')
        setImages(p.images ?? [])
        setVisible(p.visible ?? true)
        setBestSeller(p.bestSeller ? 'yes' : 'no')
        const vs = Array.isArray(p.variants) ? p.variants.map((v: any) => ({ size: v.size || '', price: typeof v.price === 'number' ? v.price : Number(v.price || 0), image: typeof v.image === 'string' ? v.image : '' })) : []
        setVariants(vs)
        setBaseSize(p.baseSize || '')
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const url = await uploadFile(f)
      setImages(prev => [...prev, url])
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = {
      title, description, brand,
      categoryId: typeof categoryId === 'number' ? categoryId : Number(categoryId),
      price: typeof price === 'number' ? price : Number(price),
      salePrice: salePrice === '' ? undefined : (typeof salePrice === 'number' ? salePrice : Number(salePrice)),
      stock: typeof stock === 'number' ? stock : Number(stock),
      itemsLeft: itemsLeft === '' ? null : (typeof itemsLeft === 'number' ? itemsLeft : Number(itemsLeft)),
      daysLeftInExpiry: daysLeftInExpiry === '' ? null : (typeof daysLeftInExpiry === 'number' ? daysLeftInExpiry : Number(daysLeftInExpiry)),
      images,
      visible,
      baseSize: baseSize || undefined,
      variants: variants
        .filter(v => v.size && v.price !== '')
        .map(v => ({ size: v.size, price: typeof v.price === 'number' ? v.price : Number(v.price), ...(v.image ? { image: v.image } : {}) })),
      bestSeller: bestSeller === 'yes'
    }
    const res = await fetch(`/api/admin/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Save failed')
      return
    }
    setToast('Saved')
  }

  const onDelete = async () => {
    if (!confirm('Delete this product?')) return
    setSaving(true)
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Delete failed')
      return
    }
    router.replace('/products')
  }

  if (loading) return <div className="p-4">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Product</h2>
        <button onClick={onDelete} className="px-3 py-2 rounded border border-red-600 text-red-600">Delete</button>
      </div>
      {toast && <div className="px-3 py-2 rounded bg-green-600 text-white text-sm">{toast}</div>}
      {error && <div className="px-3 py-2 rounded bg-red-600 text-white text-sm">{error}</div>}
      <form onSubmit={onSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
          <input className="input" placeholder="Brand" value={brand} onChange={e => setBrand(e.target.value)} required />
          <select className="select" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} required>
            <option value="">Select category</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="Price" type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} required />
          <input className="input" placeholder="Sale Price (optional)" type="number" min={0} value={salePrice} onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} />
          <input className="input" placeholder="Stock" type="number" min={0} value={stock} onChange={e => setStock(Number(e.target.value))} required />
          <input className="input" placeholder="Items Left (optional)" type="number" min={0} value={itemsLeft} onChange={e => setItemsLeft(e.target.value === '' ? '' : Number(e.target.value))} />
          <input className="input" placeholder="Days Left in Expiry (optional)" type="number" min={0} value={daysLeftInExpiry} onChange={e => setDaysLeftInExpiry(e.target.value === '' ? '' : Number(e.target.value))} />
          <div>
            <label className="block text-sm mb-1">Best Seller</label>
            <select className="select" value={bestSeller} onChange={e => setBestSeller(e.target.value as 'yes' | 'no')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <input className="input" placeholder="Default Size (e.g., 50 ml)" value={baseSize} onChange={e => setBaseSize(e.target.value)} />
        </div>
        <textarea className="w-full textarea" placeholder="Description" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex items-center gap-2">
          <input id="visible" type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
          <label htmlFor="visible">Visible</label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Variants</label>
            <button type="button" className="px-3 py-1 rounded border text-sm" onClick={() => setVariants(v => [...v, { size: '', price: '' }])}>Add Variant</button>
          </div>
          {variants.length === 0 && (
            <div className="text-sm text-gray-500">No variants.</div>
          )}
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input className="input md:col-span-3" placeholder="Size (e.g., 50ml)" value={v.size} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, size: e.target.value } : it))} />
                <input className="input md:col-span-2" placeholder="Price" type="number" min={0} value={v.price} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, price: e.target.value === '' ? '' : Number(e.target.value) } : it))} />
                <div className="md:col-span-5 flex items-center gap-2 min-w-0">
                  <input className="input flex-1 min-w-0" placeholder="Variant image URL (optional)" value={v.image || ''} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, image: e.target.value } : it))} />
                  {!!v.image && (
                    <div className="w-10 h-10 border rounded overflow-hidden shrink-0">
                      <img src={v.image} alt="variant" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <input className="md:col-span-1 w-full" type="file" onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    const url = await uploadFile(f)
                    setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, image: url } : it))
                  } catch { /* ignore */ }
                }} />
                <button type="button" className="px-3 py-2 rounded border md:col-span-1" onClick={() => setVariants(arr => arr.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500">Variants inherit the same discount percentage as the main product if a Sale Price is set.</div>
        </div>
        <div>
          <label className="block text-sm mb-1">Images</label>
          <div className="flex gap-2 items-center">
            <input className="input flex-1" placeholder="Paste image URL and click Add" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            <button type="button" className="px-3 py-2 rounded border" onClick={() => {
              const u = imageUrl.trim()
              if (!u) return
              setImages(prev => [...prev, u])
              setImageUrl('')
            }}>Add</button>
          </div>
          <input type="file" accept="image/*" onChange={handleUpload} />
          <div className="flex gap-2 mt-2 flex-wrap">
            {images.map((url, i) => (
              <div key={i} className="w-24 h-24 border rounded overflow-hidden">
                <img src={url} alt="img" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="px-4 py-2 rounded border" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
