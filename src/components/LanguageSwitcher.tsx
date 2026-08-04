'use client'

import { useLanguage } from '@/lib/language-context'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="inline-flex border rounded-lg overflow-hidden text-sm">
      <button
        className={`px-3 py-1.5 ${locale === 'pt' ? 'bg-black text-white' : 'bg-white text-neutral-600'}`}
        onClick={() => setLocale('pt')}
      >
        PT
      </button>
      <button
        className={`px-3 py-1.5 ${locale === 'en' ? 'bg-black text-white' : 'bg-white text-neutral-600'}`}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  )
}
