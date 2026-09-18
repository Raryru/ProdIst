import React, { useState, useEffect } from 'react'
import { useInboxStore } from '../store/useInboxStore'
import { useLocaleStore } from '../store/useLocaleStore'
import { Lightbulb, Plus, Trash2, CheckCircle2 } from 'lucide-react'

export default function InboxView() {
  const { ideas, fetchIdeas, addIdea, deleteIdea, convertToTask } = useInboxStore()
  const { t } = useLocaleStore()
  const [newIdea, setNewIdea] = useState('')

  useEffect(() => {
    fetchIdeas()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newIdea.trim()) return
    await addIdea(newIdea.trim())
    setNewIdea('')
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 overflow-hidden">
      {/* Ойларды жылдам жазу карточкасы */}
      <div className="glass-panel rounded-3xl p-6 shadow-xl shrink-0">
        <div className="flex items-center gap-2 text-[var(--accent-glow)] mb-2">
          <Lightbulb size={20} />
          <h2 className="text-xs font-bold text-[var(--text-main)] tracking-wider uppercase">
            {t('inbox.title')} ({t('inbox.subtitle')})
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          {t('inbox.placeholder')}
        </p>

        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            placeholder={t('inbox.placeholder')}
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            className="flex-1 glass-input rounded-2xl px-4 py-3 text-xs text-[var(--text-main)] outline-none"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-[var(--accent-glow)] hover:opacity-90 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md shrink-0"
          >
            <Plus size={16} />
            <span>{t('common.save')}</span>
          </button>
        </form>
      </div>

      {/* Сақталған ойлар тізімі */}
      <div className="glass-panel rounded-3xl p-6 shadow-xl flex-1 flex flex-col overflow-hidden">
        <h3 className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase mb-4">
          {t('inbox.title')} ({ideas.length})
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {ideas.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)] rounded-2xl">
              {t('inbox.empty')}
            </div>
          ) : (
            ideas.map((item) => (
              <div
                key={item.id}
                className="glass-input p-4 rounded-2xl flex items-center justify-between gap-4 transition"
              >
                <span className="text-xs text-[var(--text-main)] flex-1">{item.content}</span>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => convertToTask(item.id, item.content)}
                    title={t('inbox.convertToTask')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 text-xs font-semibold transition cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>{t('inbox.convertToTask')}</span>
                  </button>

                  <button
                    onClick={() => deleteIdea(item.id)}
                    title={t('inbox.delete')}
                    className="p-2 text-[var(--text-muted)] hover:text-red-400 glass-input rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}