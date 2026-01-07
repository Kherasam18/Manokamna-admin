"use client"
import { useEffect, useState } from 'react'

type FlashSale = { active: boolean; endsAt: string | null; title?: string }

export default function FlashSalePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<FlashSale>({ active: false, endsAt: null, title: 'Flash Sale' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/flash-sale', { cache: 'no-store' })
    const json = await res.json()
    setData({ active: !!json.active, endsAt: json.endsAt ? new Date(json.endsAt).toISOString().slice(0,16) : null, title: json.title || 'Flash Sale' })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save(partial: Partial<FlashSale>) {
    setSaving(true)
    const body: any = { ...data, ...partial }
    const payload = {
      active: !!body.active,
      title: body.title || 'Flash Sale',
      endsAt: body.endsAt ? new Date(body.endsAt).toISOString() : null
    }
    const res = await fetch('/api/admin/flash-sale', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    setSaving(false)
    await load()
  }

  if (loading) return <div>Loading…</div>

  const remainingMs = data.endsAt ? (new Date(data.endsAt).getTime() - Date.now()) : 0
  const ended = !data.active || remainingMs <= 0

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Flash Sale</h2>
      <div className="card">
        <div className="card-body space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-24">Title</label>
            <input className="input w-72" value={data.title || ''} onChange={e => setData(v => ({ ...v, title: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24">Active</label>
            <input type="checkbox" checked={!!data.active} onChange={e => setData(v => ({ ...v, active: e.target.checked }))} />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24">Ends At</label>
            <input type="datetime-local" className="input" value={data.endsAt || ''} onChange={e => setData(v => ({ ...v, endsAt: e.target.value }))} />
            {ended ? <span className="text-red-500 text-sm">Sale Ended</span> : <span className="text-green-500 text-sm">Running</span>}
          </div>
          <div className="flex gap-2">
            <button disabled={saving} onClick={() => save({})} className="btn btn-primary disabled:opacity-50">Save</button>
            <button disabled={saving} onClick={() => save({ active: false })} className="btn">Stop</button>
            <button disabled={saving} onClick={() => save({ active: true, endsAt: new Date(Date.now() + 60*60*1000).toISOString() })} className="btn">+1h</button>
          </div>
        </div>
      </div>
    </div>
  )
}
