import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useSessionStore } from '../store/useSessionStore'
import { useLocaleStore } from '../store/useLocaleStore'

export default function FocusGrid() {
  const { sessions, fetchSessions } = useSessionStore()
  const { locale, t } = useLocaleStore()

  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    fetchSessions(start, end)
  }, [currentDate, fetchSessions])

  const dailyFocusMap = useMemo(() => {
    const map = {}
    sessions.forEach((s) => {
      let dateKey = s.session_date
      if (!dateKey && s.created_at) {
        const d = new Date(s.created_at)
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      if (dateKey) {
        const secs = s.duration_seconds || 0
        const mins = secs > 0 && secs < 60 ? 1 : Math.round(secs / 60)
        map[dateKey] = (map[dateKey] || 0) + mins
      }
    })
    return map
  }, [sessions])

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    return Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      return {
        day: dayNum,
        date: dateStr,
        minutes: dailyFocusMap[dateStr] || 0,
      }
    })
  }, [currentDate, dailyFocusMap])

  const getCellIntensity = (minutes) => {
    if (minutes === 0) return 'bg-[var(--input-bg)] border-[var(--border-subtle)]'
    if (minutes <= 30) return 'bg-[#6366F1]/20 border-[#6366F1]/30 text-white'
    if (minutes <= 60) return 'bg-[#6366F1]/45 border-[#6366F1]/50 text-white'
    if (minutes <= 120) return 'bg-[#6366F1]/75 border-[#6366F1]/80 text-white'
    return 'bg-[#6366F1] border-[#6366F1] shadow-[0_0_8px_#6366F1] text-white'
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const monthNames = {
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    kz: ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  }

  const totalMinutes = useMemo(() => {
    return Object.values(dailyFocusMap).reduce((acc, curr) => acc + curr, 0)
  }, [dailyFocusMap])

  return (
    <div className="glass-panel p-5 rounded-3xl border border-[var(--border-subtle)] flex flex-col gap-4">
      {/* Шапка блока Focus Grid */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#6366F1]" />
          <h3 className="text-sm font-extrabold text-[var(--text-main)] tracking-wide uppercase">
            {t('focusGrid.title')}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--input-bg)] px-2 py-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:text-[var(--text-main)] text-[var(--text-muted)] transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold px-1 text-[var(--text-main)]">
              {monthNames[locale]?.[currentDate.getMonth()] || monthNames.ru[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:text-[var(--text-main)] text-[var(--text-muted)] transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Сетка ячеек */}
      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-1.5 py-2">
        {daysInMonth.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.minutes} ${t('focusGrid.minTooltip')}`}
            className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${getCellIntensity(d.minutes)}`}
          >
            <span className="text-[10px] font-mono select-none opacity-80">{d.day}</span>
          </div>
        ))}
      </div>

      {/* Подвал */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        <div>
          <span>{t('focusGrid.total')} </span>
          <strong className="text-[var(--text-main)] font-mono">
            {Math.floor(totalMinutes / 60)}{t('focusGrid.hours')} {totalMinutes % 60}{t('focusGrid.minutes')}
          </strong>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span>{t('focusGrid.less')}</span>
          <span className="w-2.5 h-2.5 rounded bg-[var(--input-bg)] border border-[var(--border-subtle)]" />
          <span className="w-2.5 h-2.5 rounded bg-[#6366F1]/20" />
          <span className="w-2.5 h-2.5 rounded bg-[#6366F1]/45" />
          <span className="w-2.5 h-2.5 rounded bg-[#6366F1]/75" />
          <span className="w-2.5 h-2.5 rounded bg-[#6366F1] shadow-[0_0_4px_#6366F1]" />
          <span>{t('focusGrid.more')}</span>
        </div>
      </div>
    </div>
  )
}