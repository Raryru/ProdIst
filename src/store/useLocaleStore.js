import { create } from 'zustand'
import { translations } from '../locales/translations'
import { supabase } from '../lib/supabase'

export const useLocaleStore = create((set, get) => ({
  locale: localStorage.getItem('app_locale') || 'ru',

  setLocale: async (newLocale, userId = null) => {
    if (!['ru', 'kz', 'en'].includes(newLocale)) return

    localStorage.setItem('app_locale', newLocale)
    set({ locale: newLocale })

    if (userId) {
      await supabase
        .from('profiles')
        .update({ language_preference: newLocale })
        .eq('id', userId)
    }
  },

  t: (path) => {
    const { locale } = get()
    const keys = path.split('.')
    let current = translations[locale] || translations.ru

    for (const key of keys) {
      if (!current || current[key] === undefined) {
        let fallback = translations.ru
        for (const fKey of keys) {
          fallback = fallback?.[fKey]
        }
        return fallback || path
      }
      current = current[key]
    }

    return current
  },
}))