import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ tasks: data, loading: false })
    } else {
      set({ loading: false })
    }
  },

  addTask: async (title, priority = 'low') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ user_id: user.id, title, priority, is_completed: false, is_in_focus: false, time_spent: 0 }])
      .select()

    if (!error && data) {
      set({ tasks: [data[0], ...get().tasks] })
    }
  },

  toggleTask: async (id, currentStatus) => {
    const nextStatus = !currentStatus
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, is_completed: nextStatus } : t))
    })

    await supabase.from('tasks').update({ is_completed: nextStatus }).eq('id', id)
  },

  toggleFocus: async (id, currentFocus) => {
    const nextFocus = !currentFocus
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, is_in_focus: nextFocus } : t))
    })

    await supabase.from('tasks').update({ is_in_focus: nextFocus }).eq('id', id)
  },

  deleteTask: async (id) => {
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
    await supabase.from('tasks').delete().eq('id', id)
  },

  // Запись времени фокуса в задачу
  addTimeToTask: async (taskId, seconds) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    const updatedSeconds = (task.time_spent || 0) + seconds

    set({
      tasks: get().tasks.map((t) => (t.id === taskId ? { ...t, time_spent: updatedSeconds } : t))
    })

    await supabase
      .from('tasks')
      .update({ time_spent: updatedSeconds })
      .eq('id', taskId)
  },
}))