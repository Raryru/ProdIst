import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGroupStore = create((set, get) => ({
  myGroups: [],
  allGroups: [],
  currentMembers: [],
  groupAssignments: [],
  selectedGroupId: null,
  loading: false,

  // 1. Загрузка групп текущего пользователя
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

  // 2. Загрузка всех доступных групп
  fetchAllGroups: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ allGroups: data })
    }
  },

  // 3. Создание группы с архетипом и приватностью
  createGroup: async (name, description, groupType = 'peer', isPrivate = true) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !name.trim()) return

    // Логика приватности по архетипам: peer всегда приватный, lounge всегда публичный
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
      alert(`Ошибка создания: ${gError.message}`)
      return
    }

    await supabase.from('group_members').insert([
      { group_id: newGroup.id, user_id: user.id, role: 'owner' }
    ])

    await get().fetchMyGroups()
    await get().fetchAllGroups()
  },

  // 4. Вступление в группу
  joinGroup: async (groupId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('group_members').insert([
      { group_id: groupId, user_id: user.id, role: 'member' }
    ])

    if (error) {
      alert(`Ошибка вступления: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    if (get().selectedGroupId === groupId) {
      await get().fetchGroupMembers(groupId)
    }
  },

  // 5. Выход из группы
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

  // 6. Смена роли участника
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

  // 7. Удаление группы
  deleteGroup: async (groupId) => {
    if (!confirm('Вы уверены, что хотите удалить группу?')) return

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      alert(`Ошибка удаления: ${error.message}`)
      return
    }

    await get().fetchMyGroups()
    await get().fetchAllGroups()
    set({ selectedGroupId: null, currentMembers: [] })
  },

  // 8. Загрузка участников группы
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

  // 9. Загрузка кураторских заданий
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

  // 10. Добавление задания куратором
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
      alert(`Ошибка добавления задания: ${error.message}`)
      return
    }

    await get().fetchAssignments(groupId)
  }
}))