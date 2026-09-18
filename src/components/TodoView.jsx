import React, { useState } from 'react'
import { useTaskStore } from '../store/useTaskStore'
import { useLocaleStore } from '../store/useLocaleStore'
import { CheckSquare, Plus, Zap, Trash2, Calendar, Clock, CheckCircle2, Circle } from 'lucide-react'

export default function TodoView() {
  const { tasks, addTask, toggleTask, deleteTask, toggleFocus } = useTaskStore()
  const { t } = useLocaleStore()

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('low')
  const [dueDate, setDueDate] = useState('')
  
  // 5 күйлі сүзгі: 'all' | 'academic' | 'uncompleted' | 'completed' | 'focus'
  const [filter, setFilter] = useState('all')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addTask({
      title: title.trim(),
      priority,
      due_date: dueDate || null
    })
    setTitle('')
    setDueDate('')
  }

  // Сүзгілеу логикасы
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'academic') {
      return task.title.trim().startsWith('[') && task.title.includes(']')
    }
    if (filter === 'completed') {
      return task.is_completed
    }
    if (filter === 'uncompleted') {
      return !task.is_completed
    }
    if (filter === 'focus') {
      return task.is_in_focus && !task.is_completed
    }
    return true
  })

  return (
    <div className="glass-panel rounded-3xl p-4 md:p-6 flex flex-col h-full overflow-hidden shadow-xl border border-[var(--border-subtle)]">
      {/* Шапка Todo */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2 text-[var(--accent-glow)]">
          <CheckSquare size={18} />
          <h2 className="text-xs font-bold tracking-wider text-[var(--text-main)] uppercase">
            {t('todo.title')}
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--input-bg)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)]">
          {filteredTasks.length} / {tasks.length}
        </span>
      </div>

      {/* Тапсырма қосу формасы (📌 стикері қосылды) */}
      <form onSubmit={handleCreate} className="flex flex-col gap-2 mb-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('todo.placeholder')}
            className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="glass-input rounded-xl px-2.5 py-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
          >
            <option value="low" className="bg-[var(--surface-card)] text-[var(--text-main)]">📌 {t('todo.priorityLow')}</option>
            <option value="medium" className="bg-[var(--surface-card)] text-[var(--text-main)]">⚡ {t('todo.priorityMedium')}</option>
            <option value="high" className="bg-[var(--surface-card)] text-[var(--text-main)]">🔥 {t('todo.priorityHigh')}</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent-glow)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md shrink-0"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[var(--input-bg)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
          <Calendar size={13} className="text-amber-400 shrink-0" />
          <span className="text-[10px] text-[var(--text-muted)] shrink-0">Дедлайн:</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-[var(--text-main)] outline-none cursor-pointer [color-scheme:dark]"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>
      </form>

      {/* 5 Сүзгілер батырмасы */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none shrink-0 border-b border-[var(--border-subtle)]">
        {[
          { key: 'all', label: t('todo.filterAll') },
          { key: 'academic', label: `🎓 ${t('todo.filterAcademic')}` },
          { key: 'uncompleted', label: t('todo.filterUncompleted') },
          { key: 'completed', label: t('todo.filterCompleted') },
          { key: 'focus', label: `⚡ ${t('todo.filterFocus')}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
              filter === tab.key
                ? 'bg-[var(--accent-glow)] text-white shadow-sm'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Тапсырмалар тізімі */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-2xl">
            {t('todo.empty')}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isAcademic = task.title.trim().startsWith('[') && task.title.includes(']')

            return (
              <div
                key={task.id}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition ${
                  task.is_completed
                    ? 'bg-[var(--surface-card)]/40 border-[var(--border-subtle)] opacity-60'
                    : 'glass-input border-[var(--border-subtle)] hover:border-[var(--accent-glow)]/40'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <button
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className="text-[var(--text-muted)] hover:text-[#10B981] transition cursor-pointer shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 size={18} className="text-[#10B981]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="overflow-hidden">
                    <span
                      className={`text-xs font-medium block truncate ${
                        task.is_completed
                          ? 'line-through text-[var(--text-muted)]'
                          : isAcademic
                          ? 'text-amber-300 font-semibold'
                          : 'text-[var(--text-main)]'
                      }`}
                    >
                      {task.title}
                    </span>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {task.due_date && (
                        <span className="flex items-center gap-1 font-mono text-amber-400">
                          <Calendar size={10} /> {task.due_date}
                        </span>
                      )}
                      {(task.time_spent || 0) > 0 && (
                        <span className="flex items-center gap-0.5 font-mono">
                          <Clock size={10} /> {Math.round(task.time_spent / 60)} {t('pomodoro.minutes')}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        task.priority === 'high'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {task.priority === 'high' ? '🔥 HIGH' : task.priority === 'medium' ? '⚡ MED' : '📌 LOW'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleFocus(task.id, task.is_in_focus)}
                    title={task.is_in_focus ? "Убрать из фокуса" : "Добавить в фокус"}
                    className={`p-1.5 rounded-xl transition cursor-pointer ${
                      task.is_in_focus
                        ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--input-bg)]'
                    }`}
                  >
                    <Zap size={13} fill={task.is_in_focus ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    title="Жою"
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 bg-[var(--input-bg)] rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}