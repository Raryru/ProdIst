import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useTaskStore } from './useTaskStore'

export const useGroupStore = create((set, get) => ({
  myGroups: [],
  allGroups: [],
  currentMembers: [],
  groupAssignments: [],
  selectedGroupId: null,
  loading: false,

  fetchMyGroups: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    set({ loading: true })
    const { data: memberRows, error: mError } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id)

    if (mError || !memberRows || memberRows.length === 0) {
      set({ myGroups: [], loading: false })
      return
    }

    const groupIds = memberRows.map((r) => r.group_id)
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)

    set({ myGroups: groupsData || [], loading: false })
  },

  fetchAllGroups: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ allGroups: data })
    }
  },

  createGroup: async (name, description, groupType = 'peer', isPrivate = true) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !name.trim()) return

    let finalIsPrivate = isPrivate
    if (groupType === 'peer') finalIsPrivate = true
    if (groupType === 'lounge') finalIsPrivate = false

    const { data: newGroup, error: gError } = await supabase
      .from('groups')
      .insert([{
        name: name.trim(),
        description: description.trim(),
        created_by: user.id,
        group_type: groupType,
        is_private: finalIsPrivate
      }])
      .select()
      .single()

    if (gError) {
      alert(`Топ құру қатесі: ${gError.message}`)
      return
    }

    await supabase.from('group_members').insert([
      { group_id: newGroup.id, user_id: user.id, role: 'owner' }
    ])

    await get().fetchMyGroups()
    await get().fetchAllGroups()
  },

  joinGroup: async (groupId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('group_members').insert([
      { group_id: groupId, user_id: user.id, role: 'member' }
    ])

    if (error) {
      alert(`Қосылу қатесі: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    await get().fetchAllGroups()
    if (get().selectedGroupId === groupId) {
      await get().fetchGroupMembers(groupId)
    }
  },

  joinGroupByCode: async (code) => {
    const cleanId = code.trim()
    if (!cleanId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: group, error: fetchErr } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', cleanId)
      .single()

    if (fetchErr || !group) {
      alert('Бұл кодпен топ табылмады')
      return
    }

    const { error: joinErr } = await supabase
      .from('group_members')
      .insert([{ group_id: group.id, user_id: user.id, role: 'member' }])

    if (joinErr) {
      if (joinErr.code === '23505') {
        alert('Сіз бұл топта барсыз')
      } else {
        alert(`Қосылу қатесі: ${joinErr.message}`)
      }
      return
    }

    await get().fetchMyGroups()
    await get().fetchGroupMembers(group.id)
  },

  leaveGroup: async (groupId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (error) {
      alert(`Шығу қатесі: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    await get().fetchAllGroups()
    set({ selectedGroupId: null, currentMembers: [] })
  },

  transferOwnershipAndLeave: async (groupId, newOwnerUserId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !newOwnerUserId) return

    const { error: memberErr } = await supabase
      .from('group_members')
      .update({ role: 'owner' })
      .eq('group_id', groupId)
      .eq('user_id', newOwnerUserId)

    if (memberErr) {
      alert(`Иелік тағайындау қатесі: ${memberErr.message}`)
      return
    }

    await supabase.from('groups').update({ created_by: newOwnerUserId }).eq('id', groupId)

    const { error: leaveErr } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (leaveErr) {
      alert(`Шығу қатесі: ${leaveErr.message}`)
      return
    }

    await get().fetchMyGroups()
    await get().fetchAllGroups()
    set({ selectedGroupId: null, currentMembers: [] })
  },

  changeMemberRole: async (groupId, targetUserId, newRole) => {
    const { error } = await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)

    if (error) {
      alert(`Рөлді ауыстыру қатесі: ${error.message}`)
      return
    }

    await get().fetchGroupMembers(groupId)
  },

  deleteGroup: async (groupId) => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId)

    if (error) {
      alert(`Жою қатесі: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    await get().fetchAllGroups()
    set({ selectedGroupId: null, currentMembers: [] })
  },

  fetchGroupMembers: async (groupId) => {
    set({ selectedGroupId: groupId })
    const { data: members, error } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles (id, username, level, xp)
      `)
      .eq('group_id', groupId)

    if (!error && members) {
      set({ currentMembers: members })
    }
    await get().fetchAssignments(groupId)
  },

  fetchAssignments: async (groupId) => {
    const { data, error } = await supabase
      .from('group_assignments')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ groupAssignments: data })
    }
  },

  createAssignment: async (groupId, title, dueDate) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !title.trim()) return

    const { error } = await supabase
      .from('group_assignments')
      .insert([{
        group_id: groupId,
        created_by: user.id,
        title: title.trim(),
        due_date: dueDate || null
      }])

    if (error) {
      alert(`Тапсырма қосу қатесі: ${error.message}`)
      return
    }

    await get().fetchAssignments(groupId)
  },

  // ӨҢДЕУ
  updateAssignment: async (groupId, assignmentId, newTitle, newDueDate) => {
    if (!newTitle.trim()) return

    const { error } = await supabase
      .from('group_assignments')
      .update({
        title: newTitle.trim(),
        due_date: newDueDate || null
      })
      .eq('id', assignmentId)

    if (error) {
      alert(`Редакциялау қатесі: ${error.message}`)
      return
    }

    // Тізімді дереу жаңарту
    set({
      groupAssignments: get().groupAssignments.map((a) =>
        a.id === assignmentId ? { ...a, title: newTitle.trim(), due_date: newDueDate || null } : a
      )
    })
    await get().fetchAssignments(groupId)
  },

  // ӨШІРУ
  deleteAssignment: async (groupId, assignmentId) => {
    const { error } = await supabase
      .from('group_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      alert(`Тапсырманы өшіру қатесі: ${error.message}`)
      return
    }

    // Тізімнен дереу алып тастау
    set({
      groupAssignments: get().groupAssignments.filter((a) => a.id !== assignmentId)
    })
  },

  // TODO-ҒА ҚОСУ
  claimAssignmentToTasks: async (title, dueDate, groupName = '') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Алдымен жүйеге кіріңіз!')
      return
    }

    const prefix = groupName ? `[${groupName}] ` : '[Топ] '

    const taskPayload = {
      user_id: user.id,
      title: `${prefix}${title}`,
      priority: 'high',
      is_completed: false,
      is_in_focus: false,
      time_spent: 0
    }

    if (dueDate) {
      taskPayload.due_date = dueDate
    }

    const { error } = await supabase
      .from('tasks')
      .insert([taskPayload])

    if (error) {
      alert(`Тапсырманы ToDo-ға қосу қатесі: ${error.message}`)
      return
    }

    alert('Тапсырма жеке ToDo тізіміңізге сәтті қосылды!')
    // ToDo дүкенін жаңарту
    await useTaskStore.getState().fetchTasks()
  }
}))