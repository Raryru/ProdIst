import React, { useState, useEffect, useRef } from 'react'
import { useGroupStore } from '../store/useGroupStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTimerStore } from '../store/useTimerStore'
import { useTaskStore } from '../store/useTaskStore'
import { supabase } from '../lib/supabase'
import SquadFlame from './SquadFlame'
import GroupChat from './GroupChat'
import { 
  Users, Plus, Award, ArrowRight, Check, Trash2, 
  Crown, ShieldAlert, Radio, MessageSquare, ArrowLeft
} from 'lucide-react'

export default function GroupsView() {
  const { user, profile } = useAuthStore()
  const { isRunning, mode, selectedTaskId } = useTimerStore()
  const { tasks } = useTaskStore()
  const { 
    myGroups = [], allGroups = [], currentMembers = [], selectedGroupId, 
    fetchMyGroups, fetchAllGroups, createGroup, joinGroup, leaveGroup, 
    fetchGroupMembers, changeMemberRole, deleteGroup 
  } = useGroupStore()

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [onlineUsers, setOnlineUsers] = useState({})
  
  // Мобильный переключатель: 'list' (список гильдий) | 'room' (комната/чат)
  const [mobileSection, setMobileSection] = useState('list')

  const channelRef = useRef(null)

  useEffect(() => {
    fetchMyGroups()
    fetchAllGroups()
  }, [])

  useEffect(() => {
    if (!selectedGroupId || !user?.id) return

    const channelName = `presence-room-${selectedGroupId}`
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } }
    })

    channelRef.current = channel

    const activeTask = (tasks || []).find((t) => t.id === selectedTaskId)
    const taskTitle = activeTask ? activeTask.title : ''
    const currentStatus = isRunning ? (mode === 'work' ? 'focus' : 'break') : 'idle'

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeMap = {}
        Object.keys(state || {}).forEach((key) => {
          if (state[key] && state[key].length > 0) {
            activeMap[key] = state[key][0]
          }
        })
        setOnlineUsers(activeMap)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => ({ ...prev, [key]: newPresences[0] }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers((prev) => {
          const copy = { ...prev }
          delete copy[key]
          return copy
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            username: profile?.username || user.email?.split('@')[0] || 'Студент',
            avatar_url: profile?.avatar_url,
            status: currentStatus,
            taskTitle: taskTitle,
            onlineAt: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [selectedGroupId, user?.id])

  useEffect(() => {
    if (!channelRef.current || !user?.id) return

    const activeTask = (tasks || []).find((t) => t.id === selectedTaskId)
    const taskTitle = activeTask ? activeTask.title : ''
    const currentStatus = isRunning ? (mode === 'work' ? 'focus' : 'break') : 'idle'

    channelRef.current.track({
      userId: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'Студент',
      avatar_url: profile?.avatar_url,
      status: currentStatus,
      taskTitle: taskTitle,
      onlineAt: new Date().toISOString()
    })
  }, [isRunning, mode, selectedTaskId, profile?.username, profile?.avatar_url])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await createGroup(name, desc)
    setName('')
    setDesc('')
  }

  const handleSelectGroup = (groupId) => {
    fetchGroupMembers(groupId)
    setMobileSection('room')
  }

  const myGroupIds = new Set((myGroups || []).map((g) => g.id))
  const selectedGroup = (allGroups || []).find((g) => g.id === selectedGroupId) || (myGroups || []).find((g) => g.id === selectedGroupId)
  const currentMember = (currentMembers || []).find((m) => m.user_id === user?.id)
  const isOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-8 h-full overflow-hidden">
      
      {/* ЛЕВАЯ КОЛОНКА: Создание и Мои группы (на смартфонах показывается при mobileSection === 'list') */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6 h-full overflow-y-auto pr-0 md:pr-1 ${
        mobileSection === 'room' ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Карточка создания */}
        <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl shrink-0">
          <div className="flex items-center gap-2 text-[var(--accent-glow)] mb-3">
            <Users size={16} />
            <h2 className="text-xs font-bold text-[var(--text-main)] tracking-wider uppercase">Создать Учебную Группу</h2>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Название группы"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
            />
            <input
              type="text"
              placeholder="Цель / Описание"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
            />
            <button
              type="submit"
              className="mt-1 px-4 py-2 bg-[var(--accent-glow)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Plus size={15} />
              <span>Создать команду</span>
            </button>
          </form>
        </div>

        {/* Список моих групп */}
        <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
          <h2 className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase mb-3">
            Мои Группы ({myGroups?.length || 0})
          </h2>
          <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
            {!myGroups || myGroups.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)] rounded-2xl">
                Вы пока не состоите в группах.
              </div>
            ) : (
              myGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className={`glass-input p-3 rounded-2xl cursor-pointer transition flex items-center justify-between ${
                    selectedGroupId === group.id ? 'border-[var(--accent-glow)] bg-[var(--accent-glow)]/10' : 'hover:border-[var(--accent-glow)]/40'
                  }`}
                >
                  <div className="overflow-hidden">
                    <h3 className="text-xs font-bold text-[var(--text-main)] truncate">{group.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{group.description || 'Без описания'}</p>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] shrink-0 ml-2" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Участники и Комната (на смартфонах при mobileSection === 'room') */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6 h-full overflow-hidden ${
        mobileSection === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedGroupId ? (
          <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
            
            {/* Кнопка "Назад к списку" для смартфонов */}
            <div className="lg:hidden mb-2">
              <button
                onClick={() => setMobileSection('list')}
                className="flex items-center gap-1.5 text-xs text-[var(--accent-glow)] font-semibold"
              >
                <ArrowLeft size={14} />
                <span>Все гильдии</span>
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)] shrink-0">
              <div className="overflow-hidden pr-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black text-[var(--text-main)] tracking-wider uppercase truncate">
                    {selectedGroup?.name || 'Комната группы'}
                  </h2>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <Radio size={10} className="animate-pulse" /> {Math.max(1, Object.keys(onlineUsers || {}).length)}
                  </span>
                </div>
                <div className="mt-2">
                  <SquadFlame streakCount={selectedGroup?.streak_count || 0} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isOwner && (
                  <button
                    onClick={() => deleteGroup(selectedGroupId)}
                    title="Удалить группу"
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => leaveGroup(selectedGroupId)}
                  className="px-2.5 py-1 glass-input text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-[11px] transition cursor-pointer"
                >
                  Выйти
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex flex-col gap-2 pr-1 flex-1">
              {!currentMembers || currentMembers.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-xs">Загрузка участников...</div>
              ) : (
                currentMembers.map((m, idx) => {
                  const isMe = m?.user_id === user?.id
                  const presence = onlineUsers?.[m?.user_id]
                  const isOnline = isMe ? true : Boolean(presence)
                  const isUserFocus = isMe 
                    ? (isRunning && mode === 'work') 
                    : presence?.status === 'focus'
                  const isUserBreak = isMe 
                    ? (isRunning && mode === 'break') 
                    : presence?.status === 'break'
                  const memberUsername = m?.profiles?.username || (isMe ? 'Вы' : 'Участник')

                  return (
                    <div key={m?.id || idx} className="glass-input p-3 rounded-2xl flex items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="relative shrink-0">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isUserFocus
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                                : isUserBreak
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                                : isOnline
                                ? 'bg-blue-400'
                                : 'bg-gray-400'
                            }`}
                          />
                        </div>

                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--text-main)] truncate">@{memberUsername}</span>
                            {(m?.role === 'owner' || m?.role === 'admin') && (
                              <Crown size={11} className="text-amber-400 shrink-0" />
                            )}
                            {m?.role === 'moderator' && (
                              <ShieldAlert size={11} className="text-blue-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {isUserFocus
                              ? `🟢 ${isMe ? (tasks.find(t => t.id === selectedTaskId)?.title || 'Фокус 25м') : (presence?.taskTitle || 'Фокус')}`
                              : isUserBreak
                              ? '☕ Перерыв'
                              : isOnline
                              ? '⚪ В сети'
                              : 'Офлайн'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
                          <Award size={12} className="text-[#10B981]" />
                          <span>Lvl {m?.profiles?.level || 1}</span>
                        </div>

                        {isOwner && m?.user_id !== user?.id && (
                          <select
                            value={m?.role || 'member'}
                            onChange={(e) => changeMemberRole(selectedGroupId, m.user_id, e.target.value)}
                            className="glass-input rounded-xl px-1.5 py-0.5 text-[10px] text-[var(--text-main)] outline-none cursor-pointer"
                          >
                            <option value="member" className="bg-[var(--surface-card)] text-[var(--text-main)]">Участник</option>
                            <option value="moderator" className="bg-[var(--surface-card)] text-[var(--text-main)]">Модератор</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
            <h2 className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase mb-3">Все Команды</h2>
            <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
              {!allGroups || allGroups.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-xs">Нет созданных команд</div>
              ) : (
                allGroups.map((group) => {
                  const isJoined = myGroupIds.has(group.id)
                  return (
                    <div key={group.id} className="glass-input p-3.5 rounded-2xl flex items-center justify-between gap-3">
                      <div className="overflow-hidden">
                        <h3 className="text-xs font-bold text-[var(--text-main)]">{group.name}</h3>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{group.description || 'Без описания'}</p>
                      </div>
                      {isJoined ? (
                        <span className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-xl bg-[#10B981]/10">
                          <Check size={13} /> Состоите
                        </span>
                      ) : (
                        <button
                          onClick={() => joinGroup(group.id)}
                          className="px-3 py-1 bg-[var(--accent-glow)]/15 text-[var(--accent-glow)] hover:bg-[var(--accent-glow)] hover:text-white text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer"
                        >
                          Вступить
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ПРАВАЯ КОЛОНКА: Realtime-Чат (на смартфонах при mobileSection === 'room') */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden ${
        mobileSection === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedGroupId ? (
          <GroupChat groupId={selectedGroupId} />
        ) : (
          <div className="glass-panel rounded-3xl p-6 shadow-xl h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)]">
            <Users size={32} className="opacity-40 mb-3 text-[var(--accent-glow)]" />
            <span>Выберите команду в списке слева, чтобы открыть комнату совместной учебы и чат</span>
          </div>
        )}
      </div>
    </div>
  )
}