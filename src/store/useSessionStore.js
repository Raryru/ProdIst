import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const getLocalDateString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useSessionStore = create((set, get) => ({
  sessions: [],
  loading: false,

  fetchSessions: async (startDate = null, endDate = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    set({ loading: true })

    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })

    if (startDate && endDate) {
      const startDay = String(startDate).split('T')[0]
      const endDay = String(endDate).split('T')[0]
      query = query.gte('session_date', startDay).lte('session_date', endDay)
    }

    const { data, error } = await query

    if (error) {
      console.error('Ошибка загрузки сессий:', error.message)
      set({ loading: false })
      return
    }

    if (data) {
      set({ sessions: data, loading: false })
    }
  },

  logSession: async ({ taskId = null, durationSeconds, xpEarned = 0 }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || durationSeconds <= 0) return

    const localDate = getLocalDateString()

    const newRecord = {
      user_id: user.id,
      task_id: taskId || null,
      duration_seconds: durationSeconds,
      xp_earned: xpEarned,
      session_date: localDate
    }

    // Мгновенное локальное обновление (Optimistic UI)
    const tempId = crypto.randomUUID()
    set({ sessions: [{ ...newRecord, id: tempId }, ...get().sessions] })

    // Отправка в Supabase
    const { data, error } = await supabase
      .from('study_sessions')
      .insert([newRecord])
      .select()
      .single()

    if (error) {
      console.error('Ошибка записи в study_sessions:', error.message)
      alert(`Ошибка базы данных: ${error.message}`)
      // Откат при сбое
      set({ sessions: get().sessions.filter((s) => s.id !== tempId) })
      return
    }

    if (data) {
      // Замена временного объекта на подтвержденный из БД
      set({
        sessions: get().sessions.map((s) => (s.id === tempId ? data : s))
      })
    }
  }
}))