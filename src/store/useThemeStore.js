import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem('prodoist-theme') || 'dark',

  initTheme: async (profile) => {
    const saved = profile?.theme_preference || localStorage.getItem('prodoist-theme') || 'dark'
    get().setTheme(saved, false)
  },

  setTheme: async (newTheme, saveToDb = true) => {
    localStorage.setItem('prodoist-theme', newTheme)
    
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.remove('light')
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }

    set({ theme: newTheme })

    if (saveToDb) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id)
      }
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  }
}))