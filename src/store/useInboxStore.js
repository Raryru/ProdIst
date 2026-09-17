import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useTaskStore } from './useTaskStore'

export const useInboxStore = create((set, get) => ({
  ideas: [],
  loading: false,

  fetchIdeas: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('inbox_ideas')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ ideas: data, loading: false })
    } else {
      set({ loading: false })
    }
  },

  addIdea: async (content) => {
    if (!content.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('inbox_ideas')
      .insert([{ user_id: user.id, content: content.trim() }])
      .select()

    if (!error && data) {
      set({ ideas: [data[0], ...get().ideas] })
    }
  },

  deleteIdea: async (id) => {
    set({ ideas: get().ideas.filter((i) => i.id !== id) })
    await supabase.from('inbox_ideas').delete().eq('id', id)
  },

  // Конвертация идеи в задачу ToDo
  convertToTask: async (id, content) => {
    // 1. Добавляем в задачи
    await useTaskStore.getState().addTask(content, 'low')
    // 2. Удаляем из инбокса
    await get().deleteIdea(id)
  },
}))