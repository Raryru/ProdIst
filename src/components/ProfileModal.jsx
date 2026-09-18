import React, { useState, useEffect, useMemo } from 'react'
import { 
  X, Award, Flame, Clock, CheckCircle2, Shield, User, Check, BarChart2 
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useTaskStore } from '../store/useTaskStore'
import { useLocaleStore } from '../store/useLocaleStore'
import { useSessionStore } from '../store/useSessionStore'

// Пресеты аватаров студента
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
]

export default function ProfileModal({ isOpen, onClose }) {
  const { profile, updateProfile } = useAuthStore()
  const { tasks } = useTaskStore()
  const { t, locale } = useLocaleStore()
  const { sessions, fetchSessions } = useSessionStore()

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Синхронизация данных профиля и загрузка сессий за последние 7 дней
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setFullName(profile.full_name || '')
      setAvatarUrl(profile.avatar_url || AVATAR_PRESETS[0])
    }

    if (isOpen) {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      fetchSessions(start.toISOString(), end.toISOString())
    }
  }, [profile, isOpen, fetchSessions])

  // Агрегация недельной активности для Bar Chart
  const weeklyData = useMemo(() => {
    const days = []
    const dayLabels = {
      ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      kz: ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
    const currentLabels = dayLabels[locale] || dayLabels.ru

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = currentLabels[d.getDay()]

      const dayMins = sessions
        .filter((s) => s.created_at?.startsWith(dateStr))
        .reduce((acc, curr) => acc + Math.round((curr.duration_seconds || 0) / 60), 0)

      days.push({ date: dateStr, label, minutes: dayMins })
    }
    return days
  }, [sessions, locale])

  const maxWeeklyMinutes = useMemo(() => {
    return Math.max(...weeklyData.map((d) => d.minutes), 60)
  }, [weeklyData])

  if (!isOpen) return null

  // Расчет базовых показателей
  const totalFocusSeconds = tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1)
  const completedTasksCount = tasks.filter((t) => t.is_completed).length

  // Сокращение для часов в зависимости от текущего языка
  const hoursUnit = locale === 'kz' ? 'с' : locale === 'en' ? 'h' : 'ч'

  // Прогресс уровня
  const currentLvlXP = (profile?.xp || 0) % 200
  const lvlProgressPercent = Math.min(100, Math.round((currentLvlXP / 200) * 100))

  // Система бейджей
  const achievements = [
    {
      title: locale === 'kz' ? 'Алғашқы фокус' : locale === 'en' ? 'First Focus' : 'Первый Фокус',
      desc: locale === 'kz' ? '1 Pomodoro сессиясын аяқтау' : locale === 'en' ? 'Complete 1 Pomodoro session' : 'Завершить 1 сессию Pomodoro',
      unlocked: totalFocusSeconds >= 1500,
      icon: '🎯'
    },
    {
      title: locale === 'kz' ? 'Қарқында' : locale === 'en' ? 'On Fire' : 'В Огне',
      desc: locale === 'kz' ? 'Стрик 3+ күнге созылды' : locale === 'en' ? 'Streak 3+ days' : 'Стрик активности 3+ дня',
      unlocked: (profile?.streak_count || 0) >= 3,
      icon: '🔥'
    },
    {
      title: locale === 'kz' ? 'Марафоншы' : locale === 'en' ? 'Marathoner' : 'Марафонец',
      desc: locale === 'kz' ? '3-деңгейге жету' : locale === 'en' ? 'Reach Level 3' : 'Достигнуть 3-го уровня',
      unlocked: (profile?.level || 1) >= 3,
      icon: '⚡'
    },
    {
      title: locale === 'kz' ? 'Өнімді Шебер' : locale === 'en' ? 'Productive Master' : 'Продуктивный Мастер',
      desc: locale === 'kz' ? '5 тапсырманы сәтті орындау' : locale === 'en' ? 'Complete 5 tasks' : 'Закрыть 5 выполненных задач',
      unlocked: completedTasksCount >= 5,
      icon: '🏆'
    },
  ]

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setMsg('')

    try {
      const res = await updateProfile({
        username: username.trim(),
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      })

      if (res?.success) {
        setMsg(t('profile.savedSuccess') || 'Сохранено!')
        setTimeout(() => setMsg(''), 2500)
      } else {
        setMsg(res?.error || 'Error')
      }
    } catch (err) {
      setMsg('Error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-7 shadow-2xl border border-[var(--border-subtle)] relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Неоновый индикатор в шапке */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-glow)] via-[#10B981] to-[var(--accent-glow)]" />

        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 text-[var(--accent-glow)]">
            <Shield size={20} />
            <h2 className="text-sm font-black tracking-wider text-[var(--text-main)] uppercase">
              {t('profile.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl glass-input transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Скроллируемая панель */}
        <div className="overflow-y-auto pr-1 py-4 flex flex-col gap-6">
          {/* Визитка: Аватар, Уровень, Шкала опыта */}
          <div className="flex flex-col sm:flex-row items-center gap-5 glass-input p-5 rounded-2xl border border-[var(--border-subtle)]">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--accent-glow)] shadow-lg shadow-[var(--accent-glow)]/20 shrink-0"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-extrabold text-[var(--text-main)]">
                  {fullName || `@${username || 'Student'}`}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[var(--accent-glow)]/15 text-[var(--accent-glow)] border border-[var(--accent-glow)]/30">
                  {t('profile.level')} {profile?.level || 1}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">@{username || profile?.username}</p>

              {/* Шкала XP */}
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  <span>XP: {(profile?.level || 1) + 1} {t('profile.level')}</span>
                  <span>{currentLvlXP} / 200 XP</span>
                </div>
                <div className="w-full h-2 bg-[var(--timer-track)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    style={{ width: `${lvlProgressPercent}%` }}
                    className="h-full bg-gradient-to-r from-[var(--accent-glow)] to-[#10B981] transition-all duration-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Карточки ключевых показателей */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-input p-3.5 rounded-2xl flex flex-col items-center justify-center text-center border border-[var(--border-subtle)]">
              <Clock size={18} className="text-[var(--accent-glow)] mb-1" />
              <span className="text-lg font-black text-[var(--text-main)] font-mono">{totalFocusHours} {hoursUnit}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">{t('profile.totalFocus')}</span>
            </div>

            <div className="glass-input p-3.5 rounded-2xl flex flex-col items-center justify-center text-center border border-[var(--border-subtle)]">
              <Flame size={18} className="text-orange-500 mb-1" />
              <span className="text-lg font-black text-[var(--text-main)] font-mono">{profile?.streak_count || 0}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">{t('profile.streak')}</span>
            </div>

            <div className="glass-input p-3.5 rounded-2xl flex flex-col items-center justify-center text-center border border-[var(--border-subtle)]">
              <CheckCircle2 size={18} className="text-[#10B981] mb-1" />
              <span className="text-lg font-black text-[var(--text-main)] font-mono">{completedTasksCount}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">{t('nav.tasks')}</span>
            </div>
          </div>

          {/* Недельный график концентрации (Weekly Bar Chart) */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--input-bg)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
                <BarChart2 size={16} className="text-[var(--accent-glow)]" />
                <span>{locale === 'kz' ? 'Апталық зейін белсенділігі' : locale === 'en' ? 'Weekly Focus Activity' : 'Активность концентрации (Неделя)'}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{t('pomodoro.minutes')}</span>
            </div>

            <div className="flex items-end justify-between gap-2 h-24 pt-2 px-1">
              {weeklyData.map((d) => {
                const heightPercent = Math.max(8, Math.round((d.minutes / maxWeeklyMinutes) * 100))
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition opacity-0 group-hover:opacity-100">
                      {d.minutes}
                    </span>
                    <div className="w-full bg-[var(--surface-card)] rounded-lg overflow-hidden flex flex-col justify-end h-16 border border-[var(--border-subtle)]">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          d.minutes > 0 ? 'bg-[#6366F1] shadow-[0_0_6px_#6366F1]' : 'bg-transparent'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Форма изменения профиля */}
          <form onSubmit={handleSave} className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-[var(--accent-glow)]" />
              <span>{locale === 'kz' ? 'Жеке деректер' : locale === 'en' ? 'Personal Details' : 'Личные данные'}</span>
            </h4>

            {/* Выбор аватара */}
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-2 font-medium">{t('profile.avatar')}:</label>
              <div className="flex gap-2.5">
                {AVATAR_PRESETS.map((url, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setAvatarUrl(url)}
                    className={`relative rounded-xl overflow-hidden p-0.5 border-2 transition cursor-pointer ${
                      avatarUrl === url ? 'border-[var(--accent-glow)] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="preset" className="w-10 h-10 rounded-lg object-cover" />
                    {avatarUrl === url && (
                      <div className="absolute inset-0 bg-[var(--accent-glow)]/30 flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">{t('profile.username')}</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                  {locale === 'kz' ? 'Аты-жөні' : locale === 'en' ? 'Full Name' : 'Полное имя'}
                </label>
                <input
                  type="text"
                  placeholder={locale === 'kz' ? 'Аты-жөні' : locale === 'en' ? 'Full name' : 'Имя Фамилия'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
                />
              </div>
            </div>

            {msg && (
              <p className="text-xs text-center font-medium text-[#10B981] bg-[#10B981]/10 py-2 rounded-xl border border-[#10B981]/20">
                {msg}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="mt-1 py-2.5 bg-[var(--accent-glow)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md active:scale-98"
            >
              {isSaving ? t('common.loading') : t('profile.save')}
            </button>
          </form>

          {/* Достижения студента */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase mb-3 flex items-center gap-1.5">
              <Award size={14} className="text-[#10B981]" />
              <span>{locale === 'kz' ? 'Жетістіктер' : locale === 'en' ? 'Badges' : 'Достижения студента'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {achievements.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl flex items-center gap-3 border transition ${
                    item.unlocked
                      ? 'glass-input border-[#10B981]/30 bg-[#10B981]/10 text-[var(--text-main)]'
                      : 'border-[var(--border-subtle)] bg-[var(--input-bg)] opacity-40 text-[var(--text-muted)]'
                  }`}
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-[var(--text-main)] truncate">{item.title}</h5>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}