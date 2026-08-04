'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import Link from 'next/link'

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function submit() {
    setError('')
    setChecking(true)
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setChecking(false)
    if (res.ok) {
      setUnlocked(true)
    } else {
      setError(t.auth.incorrectPassword)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">{t.auth.title}</h1>
        <input
          type="password"
          className="w-full border rounded-lg p-3 text-lg"
          placeholder={t.auth.passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          className="w-full bg-black text-white py-3 rounded-lg font-medium disabled:opacity-50"
          onClick={submit}
          disabled={checking}
        >
          {checking ? t.auth.checking : t.auth.enter}
        </button>
        <Link
          href="/"
          className="block text-center text-sm text-neutral-500"
        >
          {t.auth.cancel}
        </Link>
      </div>
    </main>
  )
}
