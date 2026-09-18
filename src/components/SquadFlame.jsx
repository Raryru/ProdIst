import React from 'react'
import { Flame, Zap, Sparkles, Crown } from 'lucide-react'
import { useLocaleStore } from '../store/useLocaleStore'

export default function SquadFlame({ streakCount = 0 }) {
  const { locale } = useLocaleStore()

  const getFlameTier = (streak) => {
    if (streak >= 100) {
      return {
        label: { ru: 'Солнечная Корона', kz: 'Күн Тәжі', en: 'Solar Crown' },
        icon: Crown,
        textColor: 'text-amber-500 dark:text-amber-300',
        borderColor: 'border-amber-500/40',
        bgGlow: 'bg-amber-500/10',
        aura: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-pulse'
      }
    }
    if (streak >= 60) {
      return {
        label: { ru: 'Космический Огонь', kz: 'Ғарыштық Жалын', en: 'Cosmic Fire' },
        icon: Sparkles,
        textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
        borderColor: 'border-fuchsia-500/40',
        bgGlow: 'bg-fuchsia-500/10',
        aura: 'drop-shadow-[0_0_10px_rgba(217,70,239,0.6)] animate-pulse'
      }
    }
    if (streak >= 30) {
      return {
        label: { ru: 'Лазурный Титан', kz: 'Көгілдір Титан', en: 'Azure Titan' },
        icon: Flame,
        textColor: 'text-cyan-600 dark:text-cyan-400',
        borderColor: 'border-cyan-500/40',
        bgGlow: 'bg-cyan-500/10',
        aura: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse'
      }
    }
    if (streak >= 14) {
      return {
        label: { ru: 'Электро-Огонь', kz: 'Электр Жалыны', en: 'Electro Fire' },
        icon: Zap,
        textColor: 'text-[var(--accent-glow)]',
        borderColor: 'border-[var(--accent-glow)]/40',
        bgGlow: 'bg-[var(--accent-glow)]/10',
        aura: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]'
      }
    }
    if (streak >= 5) {
      return {
        label: { ru: 'Пламя', kz: 'Жалын', en: 'Blaze' },
        icon: Flame,
        textColor: 'text-orange-500 dark:text-orange-400',
        borderColor: 'border-orange-500/40',
        bgGlow: 'bg-orange-500/10',
        aura: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.5)] animate-pulse'
      }
    }
    return {
      label: { ru: 'Искра', kz: 'Ұшқын', en: 'Spark' },
      icon: Flame,
      textColor: 'text-[var(--text-muted)]',
      borderColor: 'border-[var(--border-subtle)]',
      bgGlow: 'bg-[var(--input-bg)]',
      aura: ''
    }
  }

  const tier = getFlameTier(streakCount)
  const IconComponent = tier.icon
  const tierName = tier.label[locale] || tier.label.ru

  // Форматирование склонений для RU / KZ / EN
  const getDaysLabel = (count) => {
    if (locale === 'kz') return 'күн'
    if (locale === 'en') return count === 1 ? 'day' : 'days'
    if (count % 10 === 1 && count % 100 !== 11) return 'день'
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'дня'
    return 'дней'
  }

  return (
    <div 
      title={tierName}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${tier.borderColor} ${tier.bgGlow} transition-all cursor-default`}
    >
      <IconComponent size={16} className={`${tier.textColor} ${tier.aura}`} />
      <span className={`text-xs font-bold font-mono ${tier.textColor}`}>
        {streakCount} {getDaysLabel(streakCount)}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline font-semibold">
        {tierName}
      </span>
    </div>
  )
}