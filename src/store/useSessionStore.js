import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSessionStore = create((set, get) => ({
  sessions: [],
  loading: false,

  // Логирование завершенной/досрочной сессии фокуса
  logSession: async ({ taskId = null, durationSeconds, xpEarned = 0 }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || durationSeconds < 60) return

    const { data, error } = await supabase
      .from('study_sessions')
      .insert([
        {
          user_id: user.id,
          task_id: taskId,
          duration_seconds: durationSeconds,
          xp_earned: xpEarned,
        },
      ])
      .select()
      .single()

    if (!error && data) {
      set({ sessions: [data, ...get().sessions] })
    }
  },

  // Загрузка сессий за указанный диапазон дат
  fetchSessions: async (startDate, endDate) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ sessions: data, loading: false })
    } else {
      set({ loading: false })
    }
  },
}))