import React, { useEffect, useState, useRef } from 'react'
import { Play, Pause, RotateCcw, Sparkles, Send, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useTaskStore } from '../store/useTaskStore'
import { useInboxStore } from '../store/useInboxStore'
import { useTimerStore } from '../store/useTimerStore'
import { supabase } from '../lib/supabase'

export default function PomodoroTimer() {
  const { profile, addXP } = useAuthStore()
  const { tasks, addTimeToTask } = useTaskStore()
  const { addIdea } = useInboxStore()

  const {
    mode,
    timeLeft,
    isRunning,
    selectedTaskId,
    setSelectedTaskId,
    startTimer,
    pauseTimer,
    tick,
    resetTimer,
    switchMode,
  } = useTimerStore()

  const [quickThought, setQuickThought] = useState('')
  const focusTasks = tasks.filter((t) => t.is_in_focus && !t.is_completed)

  // Рефы для доступа к актуальным значениям внутри обработчиков событий закрытия/сворачивания
  const stateRef = useRef({ mode, timeLeft, isRunning, selectedTaskId, profile })
  useEffect(() => {
    stateRef.current = { mode, timeLeft, isRunning, selectedTaskId, profile }
  }, [mode, timeLeft, isRunning, selectedTaskId, profile])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Обновление заголовка вкладки
  useEffect(() => {
    if (isRunning) {
      document.title = `(${formatTime(timeLeft)}) Prodoist 2.0`
    } else {
      document.title = 'Prodoist 2.0'
    }
  }, [timeLeft, isRunning])

  // Рабочий интервал таймера
  useEffect(() => {
    let interval = null
    if (isRunning) {
      interval = setInterval(() => {
        tick()
      }, 500)
    }
    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Фоновая синхронизация при возвращении на вкладку
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [tick])

  // Автосохранение отработанных минут при выходе/закрытии вкладки
  useEffect(() => {
    const handleExitOrUnload = () => {
      const { mode: currentMode, timeLeft: curLeft, isRunning: active, selectedTaskId: taskId, profile: curProf } = stateRef.current
      if (currentMode === 'work' && active) {
        const elapsed = 25 * 60 - curLeft
        if (elapsed >= 60) {
          const earnedXP = Math.max(5, Math.round((elapsed / (25 * 60)) * 50))
          
          // Фоновая отправка в Supabase через beacon/fetch при закрытии вкладки
          if (taskId) {
            const task = tasks.find((t) => t.id === taskId)
            const updatedTime = (task?.time_spent || 0) + elapsed
            supabase.from('tasks').update({ time_spent: updatedTime }).eq('id', taskId).then()
          }

          if (curProf?.id) {
            const newXP = (curProf.xp || 0) + earnedXP
            const newLevel = Math.floor(newXP / 200) + 1
            supabase.from('profiles').update({ xp: newXP, level: newLevel }).eq('id', curProf.id).then()
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleExitOrUnload)
    window.addEventListener('pagehide', handleExitOrUnload)
    return () => {
      window.removeEventListener('beforeunload', handleExitOrUnload)
      window.removeEventListener('pagehide', handleExitOrUnload)
    }
  }, [tasks])

  // Завершение стандартного цикла (дошли до 00:00)
  useEffect(() => {
    if (timeLeft === 0 && !isRunning) {
      handleComplete()
    }
  }, [timeLeft, isRunning])

  const handleComplete = async () => {
    if (mode === 'work') {
      await addXP(50)
      if (selectedTaskId) {
        await addTimeToTask(selectedTaskId, 25 * 60)
      }
      alert('🎉 25 минут фокуса завершены! +50 XP начислено.')
      switchMode('break')
    } else {
      alert('🔔 Отдых завершен! Пора браться за работу.')
      switchMode('work')
    }
  }

  // Кнопка «Завершить» (появляется при нажатии паузы)
  const handleFinishEarly = async () => {
    if (mode === 'work') {
      const elapsedSeconds = 25 * 60 - timeLeft
      if (elapsedSeconds >= 60) {
        const earnedMinutes = Math.round(elapsedSeconds / 60)
        const earnedXP = Math.max(5, Math.round((elapsedSeconds / (25 * 60)) * 50))

        await addXP(earnedXP)
        if (selectedTaskId) {
          await addTimeToTask(selectedTaskId, elapsedSeconds)
        }

        alert(`🎉 Завершено! Засчитано ${earnedMinutes} мин фокуса (+${earnedXP} XP).`)
      }
      resetTimer()
      switchMode('break')
    } else {
      resetTimer()
      switchMode('work')
    }
  }

  const handleReset = () => {
    resetTimer()
  }

  const handleQuickDump = async (e) => {
    e.preventDefault()
    if (!quickThought.trim()) return
    await addIdea(quickThought.trim())
    setQuickThought('')
  }

  const totalDuration = mode === 'work' ? 25 * 60 : 5 * 60
  const elapsedSeconds = totalDuration - timeLeft
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const progress = (elapsedSeconds / totalDuration) * 100

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 flex flex-col items-center relative overflow-hidden shadow-lg shrink-0">
      
      {/* Шапка таймера */}
      <div className="flex items-center justify-between w-full mb-4">
        <div className="flex items-center gap-2 text-[var(--accent-glow)]">
          <Sparkles size={16} />
          <h2 className="text-xs font-bold tracking-wider text-[var(--text-main)] uppercase">Зона Фокуса</h2>
        </div>

        <div className="glass-input p-1 rounded-xl flex gap-1">
          <button
            onClick={() => switchMode('work')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
              mode === 'work' ? 'bg-[var(--accent-glow)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Фокус (25м)
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
              mode === 'break' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Отдых (5м)
          </button>
        </div>
      </div>

      {/* Выбор задачи */}
      {focusTasks.length > 0 && (
        <div className="w-full mb-4">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
          >
            <option value="" className="bg-[var(--surface-card)] text-[var(--text-main)]">🎯 Без привязки к задаче</option>
            {focusTasks.map((t) => (
              <option key={t.id} value={t.id} className="bg-[var(--surface-card)] text-[var(--text-main)]">🎯 {t.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Круговой индикатор таймера */}
      <div className="relative w-40 h-40 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx="80" 
            cy="80" 
            r="70" 
            stroke="var(--timer-track)" 
            strokeWidth="8" 
            fill="transparent" 
          />
          <circle
            cx="80" 
            cy="80" 
            r="70"
            stroke={mode === 'work' ? 'var(--accent-glow)' : '#10B981'}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={440}
            strokeDashoffset={440 - (440 * progress) / 100}
            strokeLinecap="round"
            className="transition-all duration-500 ease-linear"
          />
        </svg>

        <div className="absolute flex flex-col items-center select-none">
          <span className="text-3xl font-black text-[var(--text-main)] font-mono tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mt-0.5">
            {mode === 'work' ? (isRunning ? 'Концентрация' : 'Пауза') : 'Перерыв'}
          </span>
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex items-center gap-2.5 mt-4 mb-4 flex-wrap justify-center">
        {/* Кнопка Старт / Пауза */}
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl hover:opacity-90 transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
            mode === 'work' ? 'bg-[var(--accent-glow)]' : 'bg-[#10B981]'
          }`}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} />}
          <span>{isRunning ? 'Пауза' : 'Старт'}</span>
        </button>

        {/* Кнопка «Завершить»: появляется строго на паузе, если прошло не менее 1 минуты */}
        {!isRunning && mode === 'work' && elapsedMinutes >= 1 && (
          <button
            onClick={handleFinishEarly}
            title="Завершить сессию досрочно и засчитать время"
            className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <CheckCircle2 size={14} />
            <span>Завершить ({elapsedMinutes}м)</span>
          </button>
        )}

        {/* Сброс */}
        <button
          onClick={handleReset}
          className="p-2.5 glass-input text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition cursor-pointer"
          title="Сбросить таймер"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Быстрый ввод мыслей в Инбокс */}
      <form onSubmit={handleQuickDump} className="w-full flex gap-2 border-t border-[var(--border-subtle)] pt-3">
        <input
          type="text"
          placeholder="Мысль во время работы (Enter)..."
          value={quickThought}
          onChange={(e) => setQuickThought(e.target.value)}
          className="flex-1 glass-input rounded-xl px-3 py-1.5 text-[11px] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
        />
        <button
          type="submit"
          title="Отправить в Инбокс"
          className="p-2 glass-input hover:bg-[var(--accent-glow)] text-[var(--text-muted)] hover:text-white rounded-xl transition cursor-pointer shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  )
}