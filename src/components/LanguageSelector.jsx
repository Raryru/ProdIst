import React from 'react'
import { useLocaleStore } from '../store/useLocaleStore'
import { useAuthStore } from '../store/useAuthStore'

export const LanguageSelector = () => {
  const { locale, setLocale } = useLocaleStore()
  const { user } = useAuthStore()

  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'kz', label: 'ҚАЗ' },
    { code: 'en', label: 'EN' },
  ]

  return (
    <div className="flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code, user?.id)}
          className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
            locale === lang.code
              ? 'bg-[var(--accent-primary)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}