import React from 'react'
import { LayoutDashboard, Target, Users, Inbox } from 'lucide-react'
import { useLocaleStore } from '../store/useLocaleStore'

export default function MobileTabBar({ currentView, setCurrentView }) {
  const { t } = useLocaleStore()

  const tabs = [
    { id: 'dashboard', label: t('nav.focus'), icon: Target },
    { id: 'tasks', label: t('nav.tasks'), icon: LayoutDashboard },
    { id: 'inbox', label: t('nav.inbox'), icon: Inbox },
    { id: 'groups', label: t('nav.groups'), icon: Users },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-[var(--border-subtle)] flex items-center justify-around px-2 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = currentView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition cursor-pointer ${
              isActive ? 'text-[var(--accent-glow)]' : 'text-[var(--text-muted)]'
            }`}
          >
            <Icon size={19} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}