import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    set({ loading: true })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ tasks: data, loading: false })
    } else {
      set({ loading: false })
    }
  },

  // 1-ші аргумент объект немесе кәдімгі string болса да жұмыс істейді
  addTask: async (titleOrObj, maybePriority = 'low', maybeDueDate = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let finalTitle = ''
    let finalPriority = 'low'
    let finalDueDate = null

    if (typeof titleOrObj === 'object' && titleOrObj !== null) {
      finalTitle = titleOrObj.title || ''
      finalPriority = titleOrObj.priority || 'low'
      finalDueDate = titleOrObj.due_date || null
    } else {
      finalTitle = String(titleOrObj || '')
      finalPriority = maybePriority
      finalDueDate = maybeDueDate
    }

    if (!finalTitle.trim()) return

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: user.id,
        title: finalTitle.trim(),
        priority: finalPriority,
        due_date: finalDueDate || null,
        is_completed: false,
        is_in_focus: false,
        time_spent: 0
      }])
      .select()
      .single()

    if (!error && data) {
      set({ tasks: [data, ...get().tasks] })
    }
  },

  toggleTask: async (id, currentStatus) => {
    const nextStatus = !currentStatus
    await supabase.from('tasks').update({ is_completed: nextStatus }).eq('id', id)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, is_completed: nextStatus } : t))
    })
  },

  toggleFocus: async (id, currentFocus) => {
    const nextFocus = !currentFocus
    await supabase.from('tasks').update({ is_in_focus: nextFocus }).eq('id', id)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, is_in_focus: nextFocus } : t))
    })
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    set({
      tasks: get().tasks.filter((t) => t.id !== id)
    })
  },

  addTimeToTask: async (id, seconds) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const updatedTime = (task.time_spent || 0) + seconds
    await supabase.from('tasks').update({ time_spent: updatedTime }).eq('id', id)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, time_spent: updatedTime } : t))
    })
  }
}))