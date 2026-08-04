'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Home() {
  const { t } = useLanguage()

  const links = [
    { href: '/order', label: t.home.takeOrders },
    { href: '/kitchen', label: t.home.kitchen },
    { href: '/admin', label: t.home.admin },
  ]

  return (
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4 p-4">
      <div className="mb-2">
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-bold mb-4">{t.home.title}</h1>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="w-full max-w-xs text-center bg-black text-white py-4 rounded-lg text-lg font-medium"
        >
          {l.label}
        </Link>
      ))}
    </main>
  )
}
