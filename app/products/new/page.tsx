"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AiCapture, { AiResult } from './AiCapture'

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
  const [variants, setVariants] = useState<Array<{ size?: string; price: number | ''; salePrice: number | ''; image?: string }>>([])
  const [baseSize, setBaseSize] = useState('')
  // Fields last filled by "Add with camera"; highlighted until the admin edits them.
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set())
  const ai = (field: string, base: string) => (aiFilled.has(field) ? `${base} ring-2 ring-amber-400 border-amber-400` : base)
  const edited = (field: string) => setAiFilled(prev => {
    if (!prev.has(field)) return prev
    const next = new Set(prev)
    next.delete(field)
    return next
  })

  const applyAi = (r: AiResult) => {
    const filled = new Set<string>()
    if (r.name) { setTitle(r.name); filled.add('title') }
    if (r.brand) { setBrand(r.brand); filled.add('brand') }
    if (r.categoryId != null) { setCategoryId(r.categoryId); filled.add('categoryId') }
    if (r.size) { setBaseSize(r.size); filled.add('baseSize') }
    if (r.description) { setDescription(r.description); filled.add('description') }
    if (r.mrp != null) { setPrice(r.mrp); filled.add('price') }
    if (r.daysLeftInExpiry != null) { setDaysLeftInExpiry(r.daysLeftInExpiry); filled.add('daysLeftInExpiry') }
    setAiFilled(filled)
  }

  useEffect(() => { fetchCategories().then(setCats) }, [])

  const [importing, setImporting] = useState(false)
  const [imageNote, setImageNote] = useState<string | null>(null)

  // Opens Google Images for this product in a new tab (brand + name + size from the form).
  const searchOnline = () => {
    const q = [brand, title, baseSize].map(s => s.trim()).filter(Boolean).join(' ')
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`, '_blank', 'noopener')
  }

  // Warns when an image is too small to look sharp in the app.
  const checkImageSize = (url: string) => {
    const img = new Image()
    img.onload = () => {
      const side = Math.max(img.naturalWidth, img.naturalHeight)
      if (side && side < 500) {
        setImageNote(`That image is small (${img.naturalWidth}×${img.naturalHeight}) and may look blurry. Open the full-size image on the website and copy its address instead.`)
      }
    }
    img.src = url
  }

  // Copies an image from a web link into our own storage and makes it the main image.
  const importLink = async () => {
    const link = imageUrl.trim()
    if (!link) return
    if (/google\.[a-z.]+\/search|bing\.com\/(images\/)?search/i.test(link)) {
      setError('That is a search results page. Tap the image, open it on the website, then copy the image address.')
      return
    }
    setImporting(true); setError(null); setImageNote(null)
    try {
      let url: string
      if (link.startsWith('data:image/')) {
        // Google Images thumbnails are sometimes copied as inline data; upload it like a file.
        const blob = await (await fetch(link)).blob()
        url = await uploadFile(new File([blob], 'online-image', { type: blob.type || 'image/jpeg' }))
      } else {
        const res = await fetch('/api/admin/uploads/from-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not import the image')
        url = data.url
      }
      setImages(prev => [url, ...prev])
      setImageUrl('')
      checkImageSize(url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_BASE || 'https://api.manokamnabeautycentre.org'}${url}`)
    } catch (e: any) {
      setError(e?.message || 'Could not import the image')
    } finally {
      setImporting(false)
    }
  }

  const makeMain = (i: number) => setImages(prev => [prev[i], ...prev.filter((_, idx) => idx !== i)])

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
        .map(v => {
          const mrp = typeof v.price === 'number' ? v.price : Number(v.price)
          const sale = v.salePrice !== '' ? (typeof v.salePrice === 'number' ? v.salePrice : Number(v.salePrice)) : undefined
          return {
            ...(v.size ? { size: v.size } : {}),
            price: mrp,
            ...(sale != null ? { salePrice: sale } : {}),
            ...(v.image ? { image: v.image } : {})
          }
        }),
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
      <AiCapture
        onResult={applyAi}
        uploadFile={uploadFile}
        onImage={url => setImages(prev => [url, ...prev])}
        onReplaceImage={(oldUrl, newUrl) => setImages(prev => prev.map(u => (u === oldUrl ? newUrl : u)))}
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Title</span>
            <input className={ai('title', 'input w-full')} placeholder="Title" value={title} onChange={e => { setTitle(e.target.value); edited('title') }} required />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Brand</span>
            <input className={ai('brand', 'input w-full')} placeholder="Brand" value={brand} onChange={e => { setBrand(e.target.value); edited('brand') }} required />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Category</span>
            <select className={ai('categoryId', 'select w-full')} value={categoryId} onChange={e => { setCategoryId(Number(e.target.value)); edited('categoryId') }} required>
              <option value="">Select category</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">MRP</span>
            <input className={ai('price', 'input w-full')} placeholder="Price" type="number" min={0} value={price} onChange={e => { setPrice(Number(e.target.value)); edited('price') }} required />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Sale price</span>
            <input className="input w-full" placeholder="Sale Price (optional)" type="number" min={0} value={salePrice} onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Stock</span>
            <input className="input w-full" placeholder="Stock" type="number" min={0} value={stock} onChange={e => setStock(Number(e.target.value))} required />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Items left (optional)</span>
            <input className="input w-full" placeholder="Items Left (optional)" type="number" min={0} value={itemsLeft} onChange={e => setItemsLeft(e.target.value === '' ? '' : Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Days left in expiry (optional)</span>
            <input className={ai('daysLeftInExpiry', 'input w-full')} placeholder="Days Left in Expiry (optional)" type="number" min={0} value={daysLeftInExpiry} onChange={e => { setDaysLeftInExpiry(e.target.value === '' ? '' : Number(e.target.value)); edited('daysLeftInExpiry') }} />
          </label>
          <div>
            <label className="block text-sm mb-1">Best Seller</label>
            <select className="select" value={bestSeller} onChange={e => setBestSeller(e.target.value as 'yes' | 'no')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <label className="block">
            <span className="block text-xs text-gray-500 mb-1">Default size</span>
            <input className={ai('baseSize', 'input w-full')} placeholder="Default Size (e.g., 50 ml)" value={baseSize} onChange={e => { setBaseSize(e.target.value); edited('baseSize') }} />
          </label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Variants</label>
            <button type="button" className="px-3 py-1 rounded border text-sm" onClick={() => setVariants(v => [...v, { size: '', price: '', salePrice: '' }])}>Add Variant</button>
          </div>
          {variants.length === 0 && (
            <div className="text-sm text-gray-500">No variants added.</div>
          )}
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="space-y-2 p-3 border rounded">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <input className="input md:col-span-3" placeholder="Size (optional)" value={v.size || ''} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, size: e.target.value } : it))} />
                  <input className="input md:col-span-2" placeholder="MRP" type="number" min={0} value={v.price} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, price: e.target.value === '' ? '' : Number(e.target.value) } : it))} />
                  <input className="input md:col-span-2" placeholder="Sale Price" type="number" min={0} value={v.salePrice} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, salePrice: e.target.value === '' ? '' : Number(e.target.value) } : it))} />
                  <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                    <input className="input flex-1 min-w-0" placeholder="Image URL (optional)" value={v.image || ''} onChange={e => setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, image: e.target.value } : it))} />
                    {!!v.image && (
                      <div className="w-10 h-10 border rounded overflow-hidden shrink-0">
                        <img src={v.image} alt="variant" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <button type="button" className="px-3 py-2 rounded border md:col-span-1" onClick={() => setVariants(arr => arr.filter((_, idx) => idx !== i))}>Remove</button>
                </div>
                <div className="flex items-center gap-2">
                  <input className="w-full" type="file" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadFile(f);
                      setVariants(arr => arr.map((it, idx) => idx === i ? { ...it, image: url } : it));
                    } catch { /* ignore */ }
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500">Each variant has its own MRP and Sale Price. Size and image are optional.</div>
        </div>
        <label className="block">
          <span className="block text-xs text-gray-500 mb-1">Description</span>
          <textarea className={ai('description', 'w-full textarea')} placeholder="Description" rows={5} value={description} onChange={e => { setDescription(e.target.value); edited('description') }} />
        </label>
        <div>
          <label className="block text-sm mb-1">Images</label>
          <div className="text-xs text-gray-500 mb-2">
            Best: the brand&apos;s official product photo. Tap <b>Find photos online</b>, open a photo on the brand&apos;s site
            (or another listing), long-press it, choose <b>Copy image address</b>, paste it below and tap <b>Import</b>.
            The first image is the main one shown in the app.
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              className="px-3 py-2 rounded border hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              disabled={!title.trim() && !brand.trim()}
              title={!title.trim() && !brand.trim() ? 'Fill in the title or brand first' : 'Search Google Images for this product'}
              onClick={searchOnline}
            >
              🔍 Find photos online
            </button>
          </div>
          <div className="flex gap-2 items-center mt-2">
            <input
              className="input flex-1 min-w-0"
              placeholder="Paste image address here"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); importLink() } }}
            />
            <button
              type="button"
              className="px-3 py-2 rounded border hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              disabled={importing || !imageUrl.trim()}
              onClick={importLink}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
          {imageNote && <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">{imageNote}</div>}
          <div className="mt-2 text-xs text-gray-500">Or upload a photo from this device:</div>
          <div className="mt-1">
            <input type="file" accept="image/*" onChange={handleUpload} />
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {images.map((url, i) => {
              const fullUrl = url.startsWith('http')
                ? url
                : `${process.env.NEXT_PUBLIC_API_BASE || 'https://api.manokamnabeautycentre.org'}${url.startsWith('/') ? '' : '/'}${url}`
              return (
                <div key={url + i} className="relative group w-24 h-24 border rounded overflow-hidden bg-white shrink-0 shadow-sm">
                  <img
                    src={fullUrl}
                    alt={`Product image ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=200&auto=format&fit=crop'
                    }}
                  />
                  {i === 0 ? (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5">Main</span>
                  ) : (
                    <button
                      type="button"
                      className="absolute bottom-0 left-0 right-0 bg-black/60 hover:bg-black/80 text-white text-[10px] py-0.5"
                      onClick={() => makeMain(i)}
                    >
                      Make main
                    </button>
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition shadow"
                    title="Remove image"
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    &times;
                  </button>
                </div>
              )
            })}
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
