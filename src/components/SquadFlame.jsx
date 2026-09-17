import React from 'react'
import { Flame, Zap, Sparkles, Crown } from 'lucide-react'

export default function SquadFlame({ streakCount = 0 }) {
  const getFlameTier = (streak) => {
    if (streak >= 100) {
      return {
        label: 'Солнечная Корона',
        icon: Crown,
        textColor: 'text-amber-500 dark:text-amber-300',
        borderColor: 'border-amber-500/40',
        bgGlow: 'bg-amber-500/10',
        aura: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-pulse'
      }
    }
    if (streak >= 60) {
      return {
        label: 'Космический Огонь',
        icon: Sparkles,
        textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
        borderColor: 'border-fuchsia-500/40',
        bgGlow: 'bg-fuchsia-500/10',
        aura: 'drop-shadow-[0_0_10px_rgba(217,70,239,0.6)] animate-pulse'
      }
    }
    if (streak >= 30) {
      return {
        label: 'Лазурный Титан',
        icon: Flame,
        textColor: 'text-cyan-600 dark:text-cyan-400',
        borderColor: 'border-cyan-500/40',
        bgGlow: 'bg-cyan-500/10',
        aura: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse'
      }
    }
    if (streak >= 14) {
      return {
        label: 'Электро-Огонь',
        icon: Zap,
        textColor: 'text-[var(--accent-glow)]',
        borderColor: 'border-[var(--accent-glow)]/40',
        bgGlow: 'bg-[var(--accent-glow)]/10',
        aura: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]'
      }
    }
    if (streak >= 5) {
      return {
        label: 'Пламя',
        icon: Flame,
        textColor: 'text-orange-500 dark:text-orange-400',
        borderColor: 'border-orange-500/40',
        bgGlow: 'bg-orange-500/10',
        aura: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.5)] animate-pulse'
      }
    }
    return {
      label: 'Искра',
      icon: Flame,
      textColor: 'text-[var(--text-muted)]',
      borderColor: 'border-[var(--border-subtle)]',
      bgGlow: 'bg-[var(--input-bg)]',
      aura: ''
    }
  }

  const tier = getFlameTier(streakCount)
  const IconComponent = tier.icon

  return (
    <div 
      title={`Стадия: ${tier.label}`}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${tier.borderColor} ${tier.bgGlow} transition-all cursor-default`}
    >
      <IconComponent size={16} className={`${tier.textColor} ${tier.aura}`} />
      <span className={`text-xs font-bold font-mono ${tier.textColor}`}>
        {streakCount} {streakCount === 1 ? 'день' : streakCount > 1 && streakCount < 5 ? 'дня' : 'дней'}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline font-semibold">
        {tier.label}
      </span>
    </div>
  )
}