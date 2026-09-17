import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGroupStore = create((set, get) => ({
  myGroups: [],
  allGroups: [],
  currentMembers: [],
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

  // Создателю присваивается роль 'owner' (Владелец)
  createGroup: async (name, description) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !name.trim()) return

    const { data: newGroup, error: gError } = await supabase
      .from('groups')
      .insert([{ name: name.trim(), description: description.trim(), created_by: user.id }])
      .select()
      .single()

    if (gError) {
      alert(`Ошибка создания: ${gError.message}`)
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
      alert(`Не удалось вступить: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    if (get().selectedGroupId === groupId) {
      await get().fetchGroupMembers(groupId)
    }
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
      alert(`Ошибка выхода: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    if (get().selectedGroupId === groupId) {
      await get().fetchGroupMembers(groupId)
    }
  },

  // Изменение роли участника (доступно только Владельцу)
  changeMemberRole: async (groupId, targetUserId, newRole) => {
    const { error } = await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)

    if (error) {
      alert(`Ошибка изменения роли: ${error.message}`)
      return
    }

    await get().fetchGroupMembers(groupId)
  },

  // Удаление группы (доступно только Владельцу)
  deleteGroup: async (groupId) => {
    if (!confirm('Вы уверены, что хотите удалить группу? Это действие необратимо.')) return

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      alert(`Ошибка удаления группы: ${error.message}`)
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
  },
}))