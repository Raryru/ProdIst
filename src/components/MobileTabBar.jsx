import { LayoutDashboard, Target, Users, Inbox } from 'lucide-react'

export default function MobileTabBar({ currentView, setCurrentView }) {
  const tabs = [
    { id: 'dashboard', label: 'Фокус', icon: Target },
    { id: 'tasks', label: 'Задачи', icon: LayoutDashboard },
    { id: 'inbox', label: 'Инбокс', icon: Inbox },
    { id: 'groups', label: 'Группы', icon: Users },
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