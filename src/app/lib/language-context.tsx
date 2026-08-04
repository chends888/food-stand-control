'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations, type Locale } from '@/lib/translations'

type TranslationValue = (typeof translations)[keyof typeof translations]

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationValue
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'language'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === 'pt' || stored === 'en') {
      setLocaleState(stored)
    }
  }, [])

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }

  const contextValue: LanguageContextValue = {
    locale,
    setLocale,
    t: translations[locale] as TranslationValue,
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
