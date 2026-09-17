import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  checkSession: async () => {
    // Включаем полноэкранный лоадер только при первом открытии сайта
    if (!get().user) {
      set({ loading: true })
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    } catch (err) {
      console.error('Ошибка проверки сессии:', err)
    } finally {
      set({ loading: false })
    }
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      set({ profile: data })
      await get().checkAndUpdateStreak(data)
    }
  },

  checkAndUpdateStreak: async (profile) => {
    if (!profile) return

    const todayStr = new Date().toISOString().split('T')[0]
    if (profile.last_active_date === todayStr) return

    const todayDate = new Date(todayStr)
    const lastDate = profile.last_active_date ? new Date(profile.last_active_date) : null

    let newStreak = 1
    if (lastDate) {
      const diffDays = Math.round(Math.abs(todayDate - lastDate) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        newStreak = (profile.streak_count || 0) + 1
      }
    }

    set({
      profile: { ...profile, streak_count: newStreak, last_active_date: todayStr }
    })

    await supabase
      .from('profiles')
      .update({ streak_count: newStreak, last_active_date: todayStr })
      .eq('id', profile.id)
  },

  updateProfile: async (updates) => {
    try {
      const { profile, user } = get()
      const targetId = profile?.id || user?.id
      if (!targetId) return { success: false, error: 'Пользователь не найден' }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single()

      if (error) throw error
      set({ profile: data })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Ошибка обновления' }
    }
  },

  addXP: async (amount) => {
    const { profile } = get()
    if (!profile) return

    const newXP = (profile.xp || 0) + amount
    const newLevel = Math.floor(newXP / 200) + 1

    set({
      profile: { ...profile, xp: newXP, level: newLevel }
    })

    await supabase
      .from('profiles')
      .update({ xp: newXP, level: newLevel })
      .eq('id', profile.id)
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))