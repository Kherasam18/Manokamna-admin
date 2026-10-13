"use client"
import { useEffect, useState } from 'react'
import { cleanProductPhoto, downscale } from './photoTools'

export interface AiResult {
  brand: string
  name: string
  size: string
  categoryId: number | null
  description: string
  mrp: number | null
  expiryDate: string | null
  daysLeftInExpiry: number | null
  notes: string
}

interface Props {
  /** Called with what the AI read from the pack. */
  onResult: (r: AiResult) => void
  /** Uploads a photo (to Cloudinary via the backend) and returns its URL. */
  uploadFile: (f: File) => Promise<string>
  /** Adds an image URL to the product (as the main image). */
  onImage: (url: string) => void
  /** Swaps an image URL already added (used for "use original photo instead"). */
  onReplaceImage: (oldUrl: string, newUrl: string) => void
}

type Step = 'idle' | 'working' | 'done'

function PhotoSlot({ label, hint, file, onPick, onClear }: {
  label: string; hint: string; file: File | null; onPick: (f: File) => void; onClear: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return (
    <div className="flex-1 min-w-[140px] max-w-[220px]">
      <div className="text-sm font-medium mb-1">{label}</div>
      {preview ? (
        <div className="relative w-full aspect-square border rounded overflow-hidden bg-white">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button type="button" onClick={onClear} title="Remove photo"
            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-7 h-7 text-sm">&times;</button>
        </div>
      ) : (
        <label className="w-full aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center text-center text-sm text-gray-500 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2">
          <span className="text-2xl mb-1" aria-hidden>📷</span>
          <span>Take / choose photo</span>
          <span className="text-xs mt-1">{hint}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
        </label>
      )}
    </div>
  )
}

export default function AiCapture({ onResult, uploadFile, onImage, onReplaceImage }: Props) {
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [readStatus, setReadStatus] = useState('')
  const [photoStatus, setPhotoStatus] = useState('')
  const [summary, setSummary] = useState<{ filled: string[]; missing: string[]; notes: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ url: string; cleaned: boolean; original: Blob } | null>(null)

  const reset = () => {
    setFront(null); setBack(null); setStep('idle'); setSummary(null); setError(null)
    setPhoto(null); setReadStatus(''); setPhotoStatus('')
  }

  async function readLabel(frontSmall: Blob, backSmall: Blob | null) {
    setReadStatus('Reading the label…')
    const fd = new FormData()
    fd.append('photos', frontSmall, 'front.jpg')
    if (backSmall) fd.append('photos', backSmall, 'back.jpg')
    const res = await fetch('/api/admin/ai/analyze', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not read the product')
    const r = data as AiResult
    onResult(r)
    const fields: Array<[string, boolean]> = [
      ['Name', !!r.name], ['Brand', !!r.brand], ['Size', !!r.size], ['Category', r.categoryId != null],
      ['Description', !!r.description], ['MRP', r.mrp != null], ['Expiry', r.daysLeftInExpiry != null],
    ]
    setSummary({ filled: fields.filter(f => f[1]).map(f => f[0]), missing: fields.filter(f => !f[1]).map(f => f[0]), notes: r.notes })
    setReadStatus('')
  }

  async function preparePhoto(frontSmall: Blob) {
    let cleaned: Blob | null = null
    try {
      cleaned = await cleanProductPhoto(frontSmall, setPhotoStatus)
    } catch {
      setPhotoStatus('Could not remove the background, using the original photo.')
    }
    setPhotoStatus(s => (cleaned ? 'Uploading photo…' : s))
    const blob = cleaned ?? frontSmall
    let url: string
    try {
      url = await uploadFile(new File([blob], cleaned ? 'product-clean.jpg' : 'product.jpg', { type: 'image/jpeg' }))
    } catch (e: any) {
      setPhotoStatus('')
      throw new Error(`Photo upload failed${e?.message && e.message !== 'Upload failed' ? `: ${e.message}` : ''}. Add the image manually below.`)
    }
    onImage(url)
    setPhoto({ url, cleaned: !!cleaned, original: frontSmall })
    if (cleaned) setPhotoStatus('')
  }

  async function run() {
    if (!front) return
    setStep('working'); setError(null); setSummary(null); setPhoto(null)
    try {
      const [frontSmall, backSmall] = await Promise.all([downscale(front), back ? downscale(back) : Promise.resolve(null)])
      // Reading the label and cleaning the photo run side by side.
      const results = await Promise.allSettled([readLabel(frontSmall, backSmall), preparePhoto(frontSmall)])
      const messages = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message || 'Something went wrong')
      if (messages.length) setError(messages.join(' '))
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setReadStatus('')
      setStep('done')
    }
  }

  async function useOriginal() {
    if (!photo) return
    setPhotoStatus('Uploading original photo…')
    try {
      const url = await uploadFile(new File([photo.original], 'product.jpg', { type: 'image/jpeg' }))
      onReplaceImage(photo.url, url)
      setPhoto({ ...photo, url, cleaned: false })
      setPhotoStatus('')
    } catch (e: any) {
      setPhotoStatus(e?.message || 'Upload failed')
    }
  }

  const busy = step === 'working'
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900">
      <div>
        <div className="font-semibold">Add with camera (AI)</div>
        <div className="text-sm text-gray-500">
          Photograph the front of the pack. Add the back label too for MRP, size and expiry.
          The form is filled for you and the photo is cleaned to a white background. Check everything before saving.
        </div>
      </div>

      <div className="flex gap-3">
        <PhotoSlot label="Front of pack" hint="Required" file={front} onPick={setFront} onClear={() => setFront(null)} />
        <PhotoSlot label="Back label" hint="Optional: MRP, size, expiry" file={back} onPick={setBack} onClear={() => setBack(null)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={!front || busy} onClick={run}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {busy ? 'Working…' : 'Fill the form from photos'}
        </button>
        {(front || back || step !== 'idle') && !busy && (
          <button type="button" onClick={reset} className="px-4 py-2 rounded border">Start over</button>
        )}
      </div>

      {(readStatus || photoStatus) && (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {readStatus && <div>⏳ {readStatus}</div>}
          {photoStatus && <div>🖼️ {photoStatus}</div>}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {summary && (
        <div className="text-sm space-y-1">
          <div className="text-green-700 dark:text-green-400">Filled: {summary.filled.join(', ') || 'nothing'}</div>
          {summary.missing.length > 0 && <div className="text-amber-700 dark:text-amber-400">Not found on the pack, fill manually: {summary.missing.join(', ')}</div>}
          {summary.notes && <div className="text-gray-600 dark:text-gray-400">AI note: {summary.notes}</div>}
          <div className="text-gray-600 dark:text-gray-400">Fields filled by AI have a yellow outline. Enter the sale price and stock yourself.</div>
        </div>
      )}

      {photo && (
        <div className="flex items-center gap-3 text-sm">
          <img src={photo.url} alt="Product photo" className="w-16 h-16 border rounded object-cover bg-white" />
          <span className="text-gray-600 dark:text-gray-400">{photo.cleaned ? 'Cleaned photo added as the main image.' : 'Photo added as the main image.'}</span>
          {photo.cleaned && <button type="button" onClick={useOriginal} className="px-3 py-1 rounded border">Use original photo instead</button>}
        </div>
      )}
    </div>
  )
}
