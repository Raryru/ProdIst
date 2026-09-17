import React, { useState, useEffect, useRef } from 'react'
import { Send, Lock, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useTimerStore } from '../store/useTimerStore'

export default function GroupChat({ groupId }) {
  const { user } = useAuthStore()
  const { isRunning, mode } = useTimerStore()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  const isFocusLocked = isRunning && mode === 'work'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(username, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50)

    setMessages(data || [])
    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }

  useEffect(() => {
    if (!groupId) return
    fetchMessages()

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          setMessages((prev) => [...prev, { ...payload.new, profiles: profile }])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || isFocusLocked || !user) return

    const text = inputText.trim()
    setInputText('')

    await supabase.from('group_messages').insert([
      { group_id: groupId, user_id: user.id, message: text }
    ])
  }

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full border border-[var(--border-subtle)] overflow-hidden">
      
      {/* Шапка чата */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--input-bg)] shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
          <MessageSquare size={14} className="text-[var(--accent-glow)]" />
          <span>Командный чат</span>
        </div>
        {isFocusLocked && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-medium">
            <Lock size={10} /> Фокус-режим: чат закрыт
          </span>
        )}
      </div>

      {/* Список сообщений */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center text-xs text-[var(--text-muted)] mt-10">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-[var(--text-muted)] mt-10">Сообщений пока нет. Будьте первыми!</div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === user?.id
            if (m.is_system) {
              return (
                <div key={m.id} className="text-center text-[10px] text-[var(--text-muted)] py-1 font-mono">
                  {m.message}
                </div>
              )
            }
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-[var(--text-muted)] mb-0.5 px-1 font-medium">
                  {isMe ? 'Вы' : `@${m.profiles?.username || 'Участник'}`}
                </span>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs max-w-[85%] break-words ${
                    isMe
                      ? 'bg-[var(--accent-glow)] text-white shadow-md'
                      : 'glass-input text-[var(--text-main)]'
                  }`}
                >
                  {m.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода сообщения */}
      <form onSubmit={handleSendMessage} className="p-2 border-t border-[var(--border-subtle)] bg-[var(--input-bg)] flex gap-2 shrink-0">
        <input
          type="text"
          disabled={isFocusLocked}
          placeholder={isFocusLocked ? 'Чат заблокирован до окончания таймера...' : 'Сообщение в группу...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 glass-input rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isFocusLocked || !inputText.trim()}
          className="p-2 bg-[var(--accent-glow)] hover:opacity-90 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-md shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  )
}