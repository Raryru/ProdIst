import React, { useState, useEffect, useRef } from 'react'
import { useGroupStore } from '../store/useGroupStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTimerStore } from '../store/useTimerStore'
import { useTaskStore } from '../store/useTaskStore'
import { useLocaleStore } from '../store/useLocaleStore'
import { supabase } from '../lib/supabase'
import SquadFlame from './SquadFlame'
import GroupChat from './GroupChat'
import { 
  Users, Plus, Award, ArrowRight, Check, Trash2, 
  Crown, ShieldAlert, Radio, ArrowLeft, Globe, Lock,
  BookOpen, Coffee, CheckSquare, Calendar, Copy, KeyRound, 
  ArrowDownToLine, MessageSquare, AlertTriangle, UserCheck,
  Edit2, X
} from 'lucide-react'

export default function GroupsView() {
  const { user, profile } = useAuthStore()
  const { isRunning, mode, selectedTaskId } = useTimerStore()
  const { tasks } = useTaskStore()
  const { t } = useLocaleStore()
  const { 
    myGroups = [], allGroups = [], currentMembers = [], groupAssignments = [], selectedGroupId, 
    fetchMyGroups, fetchAllGroups, createGroup, joinGroup, joinGroupByCode, leaveGroup, 
    fetchGroupMembers, changeMemberRole, deleteGroup, createAssignment, claimAssignmentToTasks,
    transferOwnershipAndLeave, updateAssignment, deleteAssignment
  } = useGroupStore()

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [groupType, setGroupType] = useState('peer')
  const [isPrivate, setIsPrivate] = useState(true)

  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)

  // Жаңа тапсырма өрістері
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  // Тапсырманы редакциялау күйі
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  const [onlineUsers, setOnlineUsers] = useState({})
  const [groupsTab, setGroupsTab] = useState('my')
  const [mobileSection, setMobileSection] = useState('list')

  // Модалка
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('')

  const channelRef = useRef(null)

  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

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
    const taskTitleCurrent = activeTask ? activeTask.title : ''
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
            taskTitle: taskTitleCurrent,
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
    const taskTitleCurrent = activeTask ? activeTask.title : ''
    const currentStatus = isRunning ? (mode === 'work' ? 'focus' : 'break') : 'idle'

    channelRef.current.track({
      userId: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'Студент',
      avatar_url: profile?.avatar_url,
      status: currentStatus,
      taskTitle: taskTitleCurrent,
      onlineAt: new Date().toISOString()
    })
  }, [isRunning, mode, selectedTaskId, profile?.username, profile?.avatar_url])

  const myGroupIds = new Set((myGroups || []).map((g) => g.id))
  const selectedGroup = (allGroups || []).find((g) => g.id === selectedGroupId) || (myGroups || []).find((g) => g.id === selectedGroupId)
  const currentMember = (currentMembers || []).find((m) => m.user_id === user?.id)
  const isOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const isCuratorOrMod = currentMember?.role === 'owner' || currentMember?.role === 'moderator'

  const canManageAssignments = selectedGroup?.group_type === 'peer' ? true : isCuratorOrMod

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await createGroup(name, desc, groupType, isPrivate)
    setName('')
    setDesc('')
  }

  const handleJoinByCode = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    await joinGroupByCode(inviteCode)
    setInviteCode('')
  }

  const handleCopyCode = () => {
    if (!selectedGroupId) return
    navigator.clipboard.writeText(selectedGroupId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSelectGroup = (groupId) => {
    fetchGroupMembers(groupId)
    setMobileSection('room')
  }

  const handleBackToAllGroups = () => {
    useGroupStore.setState({ selectedGroupId: null, currentMembers: [] })
    setMobileSection('list')
  }

  const handleAddAssignment = async (e) => {
    e.preventDefault()
    if (!taskTitle.trim() || !selectedGroupId) return
    await createAssignment(selectedGroupId, taskTitle, taskDueDate)
    setTaskTitle('')
    setTaskDueDate('')
  }

  const startEdit = (a) => {
    setEditingAssignmentId(a.id)
    setEditTitle(a.title)
    setEditDueDate(a.due_date || '')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editTitle.trim() || !selectedGroupId || !editingAssignmentId) return
    await updateAssignment(selectedGroupId, editingAssignmentId, editTitle, editDueDate)
    setEditingAssignmentId(null)
  }

  const handleSmartLeave = async () => {
    if (!selectedGroupId) return

    if (isOwner) {
      const otherMembers = currentMembers.filter((m) => m.user_id !== user.id)

      if (otherMembers.length === 0) {
        const confirmed = window.confirm(
          'Вы единственный участник и владелец группы. При вашем выходе группа будет полностью удалена, чтобы не засорять память. Продолжить?'
        )
        if (confirmed) {
          await deleteGroup(selectedGroupId)
        }
        return
      }

      setSelectedSuccessorId(otherMembers[0]?.user_id || '')
      setShowTransferModal(true)
      return
    }

    if (window.confirm('Вы уверены, что хотите покинуть эту группу?')) {
      await leaveGroup(selectedGroupId)
    }
  }

  const handleConfirmTransfer = async () => {
    if (!selectedSuccessorId || !selectedGroupId) return
    await transferOwnershipAndLeave(selectedGroupId, selectedSuccessorId)
    setShowTransferModal(false)
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-8 h-full overflow-hidden">
      
      {/* ЛЕВАЯ КОЛОНКА */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6 h-full overflow-y-auto pr-0 md:pr-1 ${
        mobileSection === 'room' ? 'hidden lg:flex' : 'flex'
      }`}>
        
        {/* Карточка создания гильдии */}
        <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl shrink-0">
          <div className="flex items-center gap-2 text-[var(--accent-glow)] mb-3">
            <Users size={16} />
            <h2 className="text-xs font-bold text-[var(--text-main)] tracking-wider uppercase">
              {t('groups.createTitle')}
            </h2>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder={t('groups.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
            />
            <input
              type="text"
              placeholder={t('groups.descPlaceholder')}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="glass-input rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] outline-none"
            />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                {t('groups.typeLabel')}
              </label>
              <select
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
              >
                <option value="peer" className="bg-[var(--surface-card)] text-[var(--text-main)]">
                  🤝 {t('groups.peer')}
                </option>
                <option value="academic" className="bg-[var(--surface-card)] text-[var(--text-main)]">
                  🎓 {t('groups.academic')}
                </option>
                <option value="lounge" className="bg-[var(--surface-card)] text-[var(--text-main)]">
                  ☕ {t('groups.lounge')}
                </option>
              </select>
            </div>

            {groupType === 'academic' && (
              <label className="flex items-center gap-2 px-1 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded cursor-pointer accent-[var(--accent-glow)]"
                />
                <span>{t('groups.privateLabel')}</span>
              </label>
            )}

            <button
              type="submit"
              className="mt-1 px-4 py-2 bg-[var(--accent-glow)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Plus size={15} />
              <span>{t('groups.createBtn')}</span>
            </button>
          </form>

          {/* Вход по инвайт-коду */}
          <form onSubmit={handleJoinByCode} className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex gap-2">
            <div className="relative flex-1">
              <KeyRound size={13} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t('groups.codePlaceholder')}
                className="w-full glass-input rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)] outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[var(--surface-card)] hover:border-[var(--accent-glow)] border border-[var(--border-subtle)] text-xs font-semibold rounded-xl text-[var(--text-main)] transition cursor-pointer"
            >
              {t('groups.joinByCode')}
            </button>
          </form>
        </div>

        {/* Список групп */}
        <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
          <div className="glass-input p-1 rounded-xl flex gap-1 mb-3 shrink-0">
            <button
              onClick={() => setGroupsTab('my')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                groupsTab === 'my' ? 'bg-[var(--accent-glow)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t('groups.myGroups')} ({myGroups?.length || 0})
            </button>
            <button
              onClick={() => setGroupsTab('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                groupsTab === 'all' ? 'bg-[var(--accent-glow)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t('groups.allGroups')} ({allGroups?.filter(g => !g.is_private || myGroupIds.has(g.id)).length || 0})
            </button>
          </div>

          <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
            {groupsTab === 'my' ? (
              !myGroups || myGroups.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)] rounded-2xl">
                  {t('groups.empty')}
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
                      <div className="flex items-center gap-1.5">
                        {group.group_type === 'academic' && <BookOpen size={13} className="text-amber-400 shrink-0" />}
                        {group.group_type === 'lounge' && <Coffee size={13} className="text-emerald-400 shrink-0" />}
                        {(!group.group_type || group.group_type === 'peer') && <Users size={13} className="text-indigo-400 shrink-0" />}
                        <h3 className="text-xs font-bold text-[var(--text-main)] truncate">{group.name}</h3>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{group.description || '—'}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text-muted)] shrink-0 ml-2" />
                  </div>
                ))
              )
            ) : (
              allGroups
                .filter((g) => !g.is_private || myGroupIds.has(g.id))
                .map((group) => {
                  const isJoined = myGroupIds.has(group.id)
                  return (
                    <div
                      key={group.id}
                      onClick={() => isJoined && handleSelectGroup(group.id)}
                      className={`glass-input p-3 rounded-2xl transition flex items-center justify-between gap-3 ${
                        isJoined ? 'cursor-pointer hover:border-[var(--accent-glow)]/40' : ''
                      } ${selectedGroupId === group.id ? 'border-[var(--accent-glow)] bg-[var(--accent-glow)]/10' : ''}`}
                    >
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5">
                          {group.group_type === 'academic' && <BookOpen size={13} className="text-amber-400 shrink-0" />}
                          {group.group_type === 'lounge' && <Coffee size={13} className="text-emerald-400 shrink-0" />}
                          {(!group.group_type || group.group_type === 'peer') && <Users size={13} className="text-indigo-400 shrink-0" />}
                          <h3 className="text-xs font-bold text-[var(--text-main)] truncate">{group.name}</h3>
                          {group.is_private ? (
                            <Lock size={11} className="text-[var(--text-muted)] shrink-0" />
                          ) : (
                            <Globe size={11} className="text-[var(--text-muted)] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{group.description || '—'}</p>
                      </div>

                      {isJoined ? (
                        <span className="text-[10px] font-semibold text-[#10B981] flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-[#10B981]/10">
                          <Check size={12} /> {t('groups.members')}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            joinGroup(group.id)
                          }}
                          className="px-2.5 py-1 bg-[var(--accent-glow)]/15 text-[var(--accent-glow)] hover:bg-[var(--accent-glow)] hover:text-white text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer"
                        >
                          {t('groups.join')}
                        </button>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6 h-full overflow-hidden ${
        mobileSection === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedGroupId ? (
          <div className="glass-panel rounded-3xl p-4 md:p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-subtle)]">
              <button
                onClick={handleBackToAllGroups}
                className="flex items-center gap-1.5 text-xs text-[var(--accent-glow)] font-semibold hover:opacity-80 transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>{t('groups.allGroups')}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-mono bg-[var(--surface-card)] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] transition cursor-pointer"
                title={t('groups.copyCode')}
              >
                <Copy size={11} />
                <span>{copied ? t('groups.copied') : `${selectedGroupId.slice(0, 8)}...`}</span>
              </button>
            </div>

            {/* Хедер гильдии */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)] shrink-0">
              <div className="overflow-hidden pr-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black text-[var(--text-main)] tracking-wider uppercase truncate">
                    {selectedGroup?.name || t('groups.title')}
                  </h2>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <Radio size={10} className="animate-pulse" /> {Math.max(1, Object.keys(onlineUsers || {}).length)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <SquadFlame streakCount={selectedGroup?.streak_count || 0} />
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[var(--accent-glow)]/15 text-[var(--accent-glow)] border border-[var(--accent-glow)]/30">
                    {selectedGroup?.group_type === 'academic' 
                      ? `🎓 ${t('groups.academic')}` 
                      : selectedGroup?.group_type === 'lounge' 
                      ? `☕ ${t('groups.lounge')}` 
                      : `🤝 ${t('groups.peer')}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isOwner && (
                  <button
                    onClick={() => {
                      if (window.confirm('Вы действительно хотите полностью удалить эту гильдию?')) {
                        deleteGroup(selectedGroupId)
                      }
                    }}
                    title={t('groups.delete')}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={handleSmartLeave}
                  className="px-2.5 py-1 glass-input text-[var(--text-muted)] hover:text-red-400 rounded-xl text-[11px] transition cursor-pointer"
                >
                  {t('groups.leave')}
                </button>
              </div>
            </div>

            {/* БЛОК ЗАДАНИЙ И ДЕДЛАЙНОВ */}
            <div className="glass-input p-3 rounded-2xl mb-3 flex flex-col shrink-0 max-h-60 overflow-hidden">
              <div className="flex items-center justify-between text-amber-400 font-bold text-xs mb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={14} />
                  <span>{t('groups.assignments')}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">
                  {groupAssignments.length}
                </span>
              </div>

              {/* Қосу немесе редакциялау формасы */}
              {canManageAssignments && (
                editingAssignmentId ? (
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-1.5 mb-2.5 shrink-0 bg-[var(--surface-card)] p-2 rounded-xl border border-[var(--accent-glow)]/30">
                    <span className="text-[10px] text-[var(--accent-glow)] font-bold">Өңдеу:</span>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        min={todayStr}
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="flex-1 glass-input rounded-xl px-2 py-1 text-[11px] text-[var(--text-main)] outline-none cursor-pointer [color-scheme:dark]"
                      />
                      <button type="submit" className="px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold transition cursor-pointer">
                        Сақтау
                      </button>
                      <button type="button" onClick={() => setEditingAssignmentId(null)} className="p-1 glass-input text-[var(--text-muted)] hover:text-red-400 rounded-xl transition cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAddAssignment} className="flex flex-col gap-1.5 mb-2.5 shrink-0">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder={t('groups.newAssignment')}
                        className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                      />
                      <button 
                        type="submit" 
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0"
                      >
                        <Plus size={13} />
                        <span>{t('common.create')}</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-[var(--surface-card)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]">
                      <Calendar size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">Дедлайн:</span>
                      <input
                        type="date"
                        min={todayStr}
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="flex-1 bg-transparent text-[11px] text-[var(--text-main)] outline-none cursor-pointer [color-scheme:dark]"
                      />
                      {taskDueDate && (
                        <button
                          type="button"
                          onClick={() => setTaskDueDate('')}
                          className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition cursor-pointer"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                  </form>
                )
              )}

              {/* Тапсырмалар тізімі */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {(!groupAssignments || groupAssignments.length === 0) ? (
                  <span className="text-[11px] text-[var(--text-muted)] block text-center py-2">{t('groups.noAssignments')}</span>
                ) : (
                  groupAssignments.map((a) => (
                    <div key={a.id} className="p-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-between text-xs gap-2">
                      <div className="overflow-hidden flex-1">
                        <span className="font-medium text-[var(--text-main)] truncate block">{a.title}</span>
                        {a.due_date && (
                          <span className="text-[10px] text-amber-400/90 flex items-center gap-1 font-mono mt-0.5">
                            <Calendar size={10} /> Дедлайн: {a.due_date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canManageAssignments && (
                          <>
                            <button
                              onClick={() => startEdit(a)}
                              title="Өңдеу"
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-glow)] transition cursor-pointer"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Тапсырманы өшіруді растайсыз ба?')) {
                                  deleteAssignment(selectedGroupId, a.id)
                                }
                              }}
                              title="Өшіру"
                              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => claimAssignmentToTasks(a.title, a.due_date, selectedGroup?.name)}
                          title={t('groups.takeToTodo')}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white transition text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <ArrowDownToLine size={11} />
                          <span>{t('groups.takeToTodo')}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Список участников */}
            <div className="overflow-y-auto flex flex-col gap-2 pr-1 flex-1">
              {!currentMembers || currentMembers.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-xs">{t('common.loading')}</div>
              ) : (
                currentMembers.map((m, idx) => {
                  const isMe = m?.user_id === user?.id
                  const presence = onlineUsers?.[m?.user_id]
                  const isOnline = isMe ? true : Boolean(presence)
                  const isUserFocus = isMe ? (isRunning && mode === 'work') : presence?.status === 'focus'
                  const isUserBreak = isMe ? (isRunning && mode === 'break') : presence?.status === 'break'
                  const memberUsername = m?.profiles?.username || (isMe ? 'Вы' : 'Студент')

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
                              ? `🟢 ${isMe ? (tasks.find(t => t.id === selectedTaskId)?.title || t('groups.inFocus')) : (presence?.taskTitle || t('groups.inFocus'))}`
                              : isUserBreak
                              ? `☕ ${t('groups.onBreak')}`
                              : isOnline
                              ? `⚪ ${t('groups.online')}`
                              : 'Офлайн'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
                          <Award size={12} className="text-[#10B981]" />
                          <span>{m?.profiles?.level || 1} ур.</span>
                        </div>

                        {isOwner && m?.user_id !== user?.id ? (
                          <select
                            value={m?.role || 'member'}
                            onChange={(e) => changeMemberRole(selectedGroupId, m.user_id, e.target.value)}
                            className="glass-input rounded-xl px-1.5 py-0.5 text-[10px] text-[var(--text-main)] outline-none cursor-pointer"
                          >
                            <option value="member" className="bg-[var(--surface-card)] text-[var(--text-main)]">{t('groups.members')}</option>
                            <option value="moderator" className="bg-[var(--surface-card)] text-[var(--text-main)]">{t('groups.moderator')}</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--border-subtle)] text-[var(--text-muted)]">
                            {m?.role === 'owner' 
                              ? (selectedGroup?.group_type === 'academic' ? `🎓 ${t('groups.curator')}` : t('groups.owner')) 
                              : m?.role === 'moderator' ? `🛡️ ${t('groups.moderator')}` : t('groups.members')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-6 shadow-xl flex-1 flex flex-col items-center justify-center text-center text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)]">
            <Users size={32} className="opacity-40 mb-3 text-[var(--accent-glow)]" />
            <span className="font-semibold text-sm text-[var(--text-main)] mb-1">{t('groups.selectPromptTitle')}</span>
            <span>{t('groups.selectPromptDesc')}</span>
          </div>
        )}
      </div>

      {/* ПРАВАЯ КОЛОНКА */}
      <div className={`col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden ${
        mobileSection === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {selectedGroupId ? (
          <GroupChat groupId={selectedGroupId} />
        ) : (
          <div className="glass-panel rounded-3xl p-6 shadow-xl h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-subtle)]">
            <MessageSquare size={32} className="opacity-40 mb-3 text-[var(--accent-glow)]" />
            <span className="font-bold text-sm text-[var(--text-main)] mb-1">{t('chat.title')}</span>
            <span>{t('chat.selectPrompt')}</span>
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПЕРЕДАЧИ ВЛАДЕНИЯ */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-3xl max-w-sm w-full border border-[var(--border-subtle)] shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-bold text-[var(--text-main)]">Передача владения</h3>
            </div>
            
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              Вы являетесь создателем группы. Чтобы выйти, назначьте нового владельца из оставшихся участников:
            </p>

            <div className="mb-4">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block mb-1.5">
                Новый владелец
              </label>
              <select
                value={selectedSuccessorId}
                onChange={(e) => setSelectedSuccessorId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none cursor-pointer"
              >
                {currentMembers
                  .filter((m) => m.user_id !== user.id)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-[var(--surface-card)] text-[var(--text-main)]">
                      @{m.profiles?.username || 'Студент'} ({m.role === 'moderator' ? 'Модератор' : 'Участник'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-3.5 py-1.5 rounded-xl glass-input text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserCheck size={14} />
                <span>Передать и выйти</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}