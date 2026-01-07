"use client"
import { useEffect, useState } from 'react'

export default function HeroBannerPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    enabled: false,
    text: '',
    imageUrl: '',
    brand: '',
    categoryId: '' as number | string | ''
  })

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/hero-banner').then(r => r.json()).then(d => {
      if (!mounted) return
      setForm({
        enabled: !!d.enabled,
        text: d.text || '',
        imageUrl: d.imageUrl || '',
        brand: d.brand || '',
        categoryId: d.categoryId ?? ''
      })
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  async function save() {
    setSaving(true)
    const payload: any = {
      enabled: form.enabled,
      text: form.text,
      imageUrl: form.imageUrl || undefined,
      brand: form.brand || undefined,
      categoryId: form.categoryId === '' ? null : Number(form.categoryId)
    }
    const res = await fetch('/api/admin/hero-banner', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    setSaving(false)
    if (res.ok) alert('Saved')
    else alert('Failed to save')
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.url) setForm(f => ({ ...f, imageUrl: data.url }))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Hero Banner</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="card">
          <div className="card-body grid gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({...f, enabled: e.target.checked}))}/>
              Enable banner
            </label>

            <label className="block">
              <div className="text-sm mb-1">Text</div>
              <input className="input w-full" value={form.text} onChange={e => setForm(f => ({...f, text: e.target.value}))} placeholder="Elevate Your Glow" />
            </label>

            <label className="block">
              <div className="text-sm mb-1">Image</div>
              <div className="flex items-center gap-2">
                <input className="input w-full" value={form.imageUrl} onChange={e => setForm(f => ({...f, imageUrl: e.target.value}))} placeholder="/uploads/hero.jpg" />
                <input type="file" onChange={onUpload} />
              </div>
              {!!form.imageUrl && <img src={form.imageUrl} alt="hero" className="mt-2 h-24 rounded border" />}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm mb-1">Brand (optional)</div>
                <input className="input w-full" value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} placeholder="BrandA" />
              </label>

              <label className="block">
                <div className="text-sm mb-1">Category ID (optional)</div>
                <input type="number" className="input w-full" value={form.categoryId as any} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} placeholder="1" />
              </label>
            </div>

            <div className="text-sm text-neutral-500">If both brand and category are provided, brand takes precedence.</div>

            <div>
              <button disabled={saving} onClick={save} className="btn btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
