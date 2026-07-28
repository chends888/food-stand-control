'use client'

import { useState } from 'react'

export default function AdminGate({ children }: { children: React.ReactNode }) {
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
      setError('Incorrect password')
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white border rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Admin login</h1>
        <input
          type="password"
          className="w-full border rounded-lg p-3 text-lg"
          placeholder="Password"
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
          {checking ? 'Checking...' : 'Enter'}
        </button>
      </div>
    </main>
  )
}
