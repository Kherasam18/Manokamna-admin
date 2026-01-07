"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function NewProductPage() {
  const router = useRouter()
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
  const [cats, setCats] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bestSeller, setBestSeller] = useState<'yes' | 'no'>('no')
  const [variants, setVariants] = useState<Array<{ size?: string; price: number | ''; image?: string }>>([])
  const [baseSize, setBaseSize] = useState('')

  useEffect(() => { fetchCategories().then(setCats) }, [])

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const body = {
      title, description, brand,
      categoryId: typeof categoryId === 'number' ? categoryId : Number(categoryId),
      price: typeof price === 'number' ? price : Number(price),
      salePrice: salePrice === '' ? undefined : (typeof salePrice === 'number' ? salePrice : Number(salePrice)),
      stock: typeof stock === 'number' ? stock : Number(stock),
      itemsLeft: itemsLeft === '' ? undefined : (typeof itemsLeft === 'number' ? itemsLeft : Number(itemsLeft)),
      daysLeftInExpiry: daysLeftInExpiry === '' ? undefined : (typeof daysLeftInExpiry === 'number' ? daysLeftInExpiry : Number(daysLeftInExpiry)),
      images,
      baseSize: baseSize || undefined,
      variants: variants
        .filter(v => v.price !== '')
        .map(v => ({
          ...(v.size ? { size: v.size } : {}),
          price: typeof v.price === 'number' ? v.price : Number(v.price),
          ...(v.image ? { image: v.image } : {})
        })),
      bestSeller: bestSeller === 'yes'
    }
    const res = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Save failed')
      return
    }
    router.replace('/products')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">New Product</h2>
      <form onSubmit={onSubmit} className="space-y-4">
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Variants</label>
            <button type="button" className="px-3 py-1 rounded border text-sm" onClick={() => setVariants(v => [...v, { size: '', price: '' }])}>Add Variant</button>
          </div>
          {variants.length === 0 && (
            <div className="text-sm text-gray-500">No variants added.</div>
          )}
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input className="input md:col-span-3" placeholder="Size (optional)" value={v.size || ''} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, size: e.target.value } : it))} />
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
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const url = await uploadFile(f);
                    setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, image: url } : it));
                  } catch { /* ignore */ }
                }} />
                <button type="button" className="px-3 py-2 rounded border md:col-span-1" onClick={() => setVariants(arr => arr.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500">Size and image are optional. Each variant will automatically use the same discount percentage as the main product (if a Sale Price is set).</div>
        </div>
        <textarea className="w-full textarea" placeholder="Description" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
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
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button disabled={loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
          <button type="button" className="px-4 py-2 rounded border" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
