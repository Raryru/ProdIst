// =========================================================================
// 1. ИМПОРТЫ И ЗАВИСИМОСТИ СИСТЕМЫ
// =========================================================================
import React, { useState, useEffect } from 'react'

// Хранилища состояния (Supabase и Zustand)
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/useAuthStore'
import { useTaskStore } from './store/useTaskStore'
import { useGroupStore } from './store/useGroupStore'
import { useTimerStore } from './store/useTimerStore'
import { useThemeStore } from './store/useThemeStore'
import { useLocaleStore } from './store/useLocaleStore'

// Модули интерфейса и мобильная навигация
import PomodoroTimer from './components/PomodoroTimer'
import FocusGrid from './components/FocusGrid'
import GroupsView from './components/GroupsView'
import InboxView from './components/InboxView'
import TodoView from './components/TodoView'
import ProfileModal from './components/ProfileModal'
import MobileTabBar from './components/MobileTabBar'
import { LanguageSelector } from './components/LanguageSelector'

// Векторные иконки Lucide
import { 
  Flame, Award, LogOut, Sparkles, ArrowRight, Mail, Lock, User, 
  Zap, Target, Users, LayoutDashboard, Inbox, Sun, Moon, Circle 
} from 'lucide-react'

// =========================================================================
// 2. ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ (APP SHELL)
// =========================================================================
export default function App() {
  // -----------------------------------------------------------------------
  // 2.1. Состояние хранилищ (Zustand)
  // -----------------------------------------------------------------------
  const { user, profile, checkSession, signOut, loading } = useAuthStore()
  const { tasks, fetchTasks, toggleTask, toggleFocus } = useTaskStore()
  const { myGroups, fetchMyGroups } = useGroupStore()
  const { isRunning, mode, selectedTaskId } = useTimerStore()
  const { theme, initTheme, toggleTheme } = useThemeStore()
  const { t, setLocale, locale } = useLocaleStore()

  // -----------------------------------------------------------------------
  // 2.2. Навигация и диалоговые окна
  // -----------------------------------------------------------------------
  const [currentView, setCurrentView] = useState('dashboard')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Поля авторизации
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // -----------------------------------------------------------------------
  // 2.3. Синхронизация сессии, темы и локали
  // -----------------------------------------------------------------------
  useEffect(() => {
    checkSession()
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkSession()
      }
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTasks()
      fetchMyGroups()
      initTheme(profile)
      if (profile?.language_preference) {
        setLocale(profile.language_preference)
      }
    } else {
      initTheme(null)
    }
  }, [user, profile?.theme_preference, profile?.language_preference])

  // Realtime Presence: трансляция рабочего статуса в группы
  useEffect(() => {
    if (!user || myGroups.length === 0) return

    const activeTask = tasks.find((t) => t.id === selectedTaskId)
    const taskTitle = activeTask ? activeTask.title : ''
    const currentStatus = isRunning ? (mode === 'work' ? 'focus' : 'break') : 'idle'

    const channels = myGroups.map((group) => {
      const channel = supabase.channel(`presence-group-${group.id}`, {
        config: { presence: { key: user.id } }
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            username: profile?.username || 'Студент',
            avatar_url: profile?.avatar_url,
            status: currentStatus,
            taskTitle: taskTitle,
            onlineAt: new Date().toISOString()
          })
        }
      })

      return channel
    })

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [user?.id, myGroups, isRunning, mode, selectedTaskId, profile?.username, profile?.avatar_url, tasks])

  // -----------------------------------------------------------------------
  // 2.4. Обработчик авторизации
  // -----------------------------------------------------------------------
  const handleAuth = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setAuthLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username || email.split('@')[0] } }
        })
        if (error) throw error
        alert(locale === 'kz' ? 'Тіркелу сәтті аяқталды!' : locale === 'en' ? 'Registration successful!' : 'Регистрация прошла успешно!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setErrorMsg(err.message || (locale === 'kz' ? 'Кіру қатесі' : locale === 'en' ? 'Sign in error' : 'Ошибка входа'))
    } finally {
      setAuthLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // 2.5. ЭКРАН 1: ЗАГРУЗКА
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="bg-[var(--bg-base)] flex h-screen w-screen items-center justify-center text-[var(--accent-glow)] font-medium">
        <div className="flex items-center gap-3 glass-panel px-6 py-4 rounded-2xl">
          <div className="w-4 h-4 rounded-full bg-[var(--accent-glow)] animate-ping" />
          <span className="text-sm tracking-wide text-[var(--text-main)]">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // 2.6. ЭКРАН 2: АВТОРИЗАЦИЯ
  // -----------------------------------------------------------------------
  if (!user) {
    return (
      <div className="bg-[var(--bg-base)] min-h-screen flex flex-col w-full items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent-glow)] to-[#10B981]" />
          
          <div className="flex justify-end mb-2">
            <LanguageSelector />
          </div>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-glow)]/10 border border-[var(--accent-glow)]/30 flex items-center justify-center mx-auto mb-4 text-[var(--accent-glow)] shadow-lg">
              <Sparkles size={26} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]">Prodoist</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
              {locale === 'kz' ? 'Өнімділіктің цифрлық хабы 2.0' : locale === 'en' ? 'Digital Productivity Hub 2.0' : 'Цифровой Хаб Продуктивности 2.0'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">{t('profile.username')}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_student"
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                {locale === 'kz' ? 'Құпиясөз' : locale === 'en' ? 'Password' : 'Пароль'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 bg-[var(--accent-glow)] hover:opacity-90 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg text-sm"
            >
              <span>
                {authLoading 
                  ? t('common.loading') 
                  : isSignUp 
                  ? (locale === 'kz' ? 'Тіркелу' : locale === 'en' ? 'Sign Up' : 'Зарегистрироваться')
                  : (locale === 'kz' ? 'Аккаунтқа кіру' : locale === 'en' ? 'Sign In' : 'Войти в аккаунт')}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 text-center border-t border-[var(--border-subtle)] pt-4">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-glow)] transition font-medium cursor-pointer"
            >
              {isSignUp 
                ? (locale === 'kz' ? 'Аккаунтыңыз бар ма? Кіру' : locale === 'en' ? 'Already have an account? Sign In' : 'Уже есть аккаунт? Войти')
                : (locale === 'kz' ? 'Аккаунтыңыз жоқ па? Тіркелу' : locale === 'en' ? "Don't have an account? Sign Up" : 'Нет аккаунта? Зарегистрироваться')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const focusTasks = tasks.filter((t) => t.is_in_focus && !t.is_completed)

  // -----------------------------------------------------------------------
  // 2.7. ЭКРАН 3: ГЛАВНЫЙ ИНТЕРФЕЙС
  // -----------------------------------------------------------------------
  return (
    <div className="bg-[var(--bg-base)] flex h-screen w-screen text-[var(--text-main)] flex-col overflow-hidden">
      
      {/* ШАПКА ПРИЛОЖЕНИЯ */}
      <header className="glass-panel border-b border-[var(--border-subtle)] h-16 md:h-18 px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2.5">
            <div className="p-2 md:p-2.5 rounded-2xl bg-[var(--accent-glow)]/10 border border-[var(--accent-glow)]/20 text-[var(--accent-glow)]">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base md:text-xl font-black tracking-wider text-[var(--text-main)]">Prodoist</h1>
                <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] bg-[var(--border-subtle)] px-2 py-0.5 rounded-full font-mono">v2.0 Pro</span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                currentView === 'dashboard' || currentView === 'tasks' ? 'bg-[var(--accent-glow)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>{t('nav.focus')} & {t('nav.tasks')}</span>
            </button>

            <button
              onClick={() => setCurrentView('groups')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                currentView === 'groups' ? 'bg-[var(--accent-glow)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Users size={15} />
              <span>{t('nav.groups')}</span>
            </button>

            <button
              onClick={() => setCurrentView('inbox')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                currentView === 'inbox' ? 'bg-[var(--accent-glow)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Inbox size={15} />
              <span>{t('nav.inbox')}</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden sm:flex glass-input items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Award className="text-[#10B981]" size={16} />
            <span>{t('profile.level')} {profile?.level || 1}</span>
          </div>

          <div className="glass-input flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Flame className="text-orange-500" size={16} />
            <span>{profile?.streak_count || 0} {t('profile.streak')}</span>
          </div>

          <LanguageSelector />

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] glass-input rounded-xl transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[var(--accent-glow)]" />}
          </button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-[var(--border-subtle)]">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl glass-panel hover:border-[var(--accent-glow)]/40 transition cursor-pointer"
              title={t('profile.title')}
            >
              <img
                src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt="avatar"
                className="w-6 h-6 rounded-lg object-cover border border-[var(--accent-glow)]"
              />
              <span className="hidden lg:inline text-xs font-semibold">
                @{profile?.username || 'Student'}
              </span>
            </button>

            <button
              onClick={signOut}
              title={t('profile.logout')}
              className="p-2 text-[var(--text-muted)] hover:text-red-400 glass-input rounded-xl transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* РАБОЧАЯ ОБЛАСТЬ */}
      <main className="flex-1 p-3 md:p-8 pb-20 md:pb-8 overflow-hidden max-w-[1600px] mx-auto w-full z-10">
        {currentView === 'groups' ? (
          <GroupsView />
        ) : currentView === 'inbox' ? (
          <InboxView />
        ) : (
          <div className="grid grid-cols-12 gap-4 md:gap-8 h-full overflow-hidden">
            
            {/* СОЛ ЖАҚ: ФОКУС, ТАЙМЕР, FOCUS GRID */}
            <div className={`col-span-12 lg:col-span-5 flex flex-col gap-4 md:gap-6 h-full overflow-y-auto pr-0 md:pr-1 ${
              currentView === 'tasks' ? 'hidden md:flex' : 'flex'
            }`}>
              <div className="glass-panel rounded-3xl p-4 md:p-6 flex flex-col shrink-0 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[var(--accent-glow)]">
                    <Target size={18} />
                    <h2 className="text-xs font-bold text-[var(--text-main)] tracking-wider uppercase">{t('nav.focus')} (Rule of 3)</h2>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[var(--accent-glow)]/10 text-[var(--accent-glow)] font-mono border border-[var(--accent-glow)]/20">
                    {focusTasks.length} / 3
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {focusTasks.length === 0 ? (
                    <div className="border border-dashed border-[var(--border-subtle)] rounded-2xl p-5 text-center text-[var(--text-muted)] text-xs">
                      {t('todo.empty')}
                    </div>
                  ) : (
                    focusTasks.map((task) => (
                      <div key={task.id} className="glass-input p-3 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <button 
                            onClick={() => toggleTask(task.id, task.is_completed)} 
                            className="text-[var(--accent-glow)] hover:text-[#10B981] transition cursor-pointer shrink-0"
                          >
                            <Circle size={18} />
                          </button>
                          <span className="text-xs font-medium truncate">{task.title}</span>
                        </div>
                        <button 
                          onClick={() => toggleFocus(task.id, true)} 
                          title="Убрать из фокуса"
                          className="text-[var(--accent-glow)] hover:text-red-400 p-1.5 rounded-xl bg-[var(--accent-glow)]/10 transition cursor-pointer shrink-0"
                        >
                          <Zap size={14} fill="currentColor" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Таймер глубокого фокуса */}
              <PomodoroTimer />

              {/* Матрица активности Focus Grid */}
              <FocusGrid />
            </div>

            {/* ОҢ ЖАҚ: ТОЛЫҚ БАСҚАРЫЛАТЫН СҮЗГІЛЕРІ БАР TODOVIEW */}
            <div className={`col-span-12 lg:col-span-7 flex flex-col h-full overflow-hidden ${
              currentView === 'dashboard' ? 'hidden md:flex' : 'flex'
            }`}>
              <TodoView />
            </div>
          </div>
        )}
      </main>

      {/* НИЖНЯЯ ПАНЕЛЬ ДЛЯ МОБИЛЬНЫХ */}
      <MobileTabBar currentView={currentView} setCurrentView={setCurrentView} />

      {/* ПАСПОРТ СТУДЕНТА */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  )
}