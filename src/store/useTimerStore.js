import { create } from 'zustand'

const STORAGE_KEY = 'prodoist_timer_state'

const loadInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.isRunning && parsed.targetEndTime) {
        const remaining = Math.max(0, Math.ceil((parsed.targetEndTime - Date.now()) / 1000))
        return {
          ...parsed,
          timeLeft: remaining,
          isRunning: remaining > 0,
        }
      }
      return parsed
    }
  } catch (e) {
    console.error('Ошибка загрузки таймера:', e)
  }
  return {
    mode: 'work', // 'work' | 'break'
    timeLeft: 25 * 60,
    isRunning: false,
    targetEndTime: null,
    selectedTaskId: '',
  }
}

export const useTimerStore = create((set, get) => ({
  ...loadInitialState(),

  saveToStorage: () => {
    const { mode, timeLeft, isRunning, targetEndTime, selectedTaskId } = get()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode, timeLeft, isRunning, targetEndTime, selectedTaskId })
    )
  },

  setSelectedTaskId: (taskId) => {
    set({ selectedTaskId: taskId })
    get().saveToStorage()
  },

  startTimer: () => {
    const { timeLeft } = get()
    const targetEndTime = Date.now() + timeLeft * 1000
    set({ isRunning: true, targetEndTime })
    get().saveToStorage()
  },

  pauseTimer: () => {
    const { targetEndTime, isRunning } = get()
    if (isRunning && targetEndTime) {
      const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))
      set({ isRunning: false, timeLeft: remaining, targetEndTime: null })
    } else {
      set({ isRunning: false, targetEndTime: null })
    }
    get().saveToStorage()
  },

  tick: () => {
    const { isRunning, targetEndTime } = get()
    if (!isRunning || !targetEndTime) return

    const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))
    set({ timeLeft: remaining })

    if (remaining <= 0) {
      set({ isRunning: false, targetEndTime: null })
      get().saveToStorage()
    }
  },

  resetTimer: () => {
    const { mode } = get()
    const duration = mode === 'work' ? 25 * 60 : 5 * 60
    set({ isRunning: false, targetEndTime: null, timeLeft: duration })
    get().saveToStorage()
  },

  switchMode: (newMode) => {
    const duration = newMode === 'work' ? 25 * 60 : 5 * 60
    set({ mode: newMode, isRunning: false, targetEndTime: null, timeLeft: duration })
    get().saveToStorage()
  },
}))