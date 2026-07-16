"use client"
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6 mt-10">Loading…</div>}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/products'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    const url = '/api/login'
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Login failed')
      return
    }
    const data = await res.json().catch(() => ({} as any))
    const token = data?.token as string | undefined
    if (token) {
      const oneMonth = 60 * 60 * 24 * 30
      document.cookie = `admin_token=${token}; Max-Age=${oneMonth}; Path=/; SameSite=Lax; Secure`
    }
    router.replace(next)
  }

  return (
    <div className="max-w-sm mx-auto p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl mt-10">
      <h2 className="text-xl font-semibold">Admin Login</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="w-full border border-neutral-800 bg-black text-white placeholder:text-neutral-400 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-neutral-600" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full border border-neutral-800 bg-black text-white placeholder:text-neutral-400 px-3 py-2 rounded outline-none focus:ring-2 focus:ring-neutral-600" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button disabled={loading} className="w-full bg-black text-white py-2 rounded hover:opacity-90 transition disabled:opacity-50">{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  )
}
