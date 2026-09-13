import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'vuex'

const sendMessage = vi.hoisted(() => vi.fn())
const getConversation = vi.hoisted(() => vi.fn())
const listConversations = vi.hoisted(() => vi.fn())

vi.mock('@/modules/chat/services/chat.service', () => ({
  chatService: { sendMessage, getConversation, listConversations },
}))

import chat from '@/modules/chat/store/chat.store'

const makeStore = () => createStore({ modules: { chat } })

describe('chat store sendMessage', () => {
  beforeEach(() => {
    sendMessage.mockReset()
    getConversation.mockReset()
    listConversations.mockReset()
    listConversations.mockResolvedValue({ items: [], currentPage: 1, lastPage: 1 })
  })

  it('appends the reply and clears the error on success', async () => {
    const store = makeStore()
    sendMessage.mockResolvedValue({
      conversation_id: 'c1',
      message: 'Hello there.',
      tool_calls: [],
    })

    await store.dispatch('chat/sendMessage', 'Hi')

    const messages = store.getters['chat/messages']
    expect(messages).toHaveLength(2)
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'Hello there.' })
    expect(store.getters['chat/chatError']).toBeNull()
  })

  it('shows an error bubble and keeps it when the failure is not a timeout', async () => {
    const store = makeStore()
    sendMessage.mockRejectedValue(
      Object.assign(new Error('Could not connect to the server. Please check your connection.'), {
        isTimeout: false,
      }),
    )

    await expect(store.dispatch('chat/sendMessage', 'Hi')).rejects.toThrow()

    const messages = store.getters['chat/messages']
    expect(messages).toHaveLength(2)
    expect(messages[1]).toMatchObject({ role: 'assistant', isError: true })
    expect(getConversation).not.toHaveBeenCalled()
  })

  it('does not attempt reconciliation on timeout when there is no conversation yet', async () => {
    const store = makeStore()
    sendMessage.mockRejectedValue(
      Object.assign(new Error('The assistant is taking longer than expected to respond.'), {
        isTimeout: true,
      }),
    )

    await expect(store.dispatch('chat/sendMessage', 'Hi')).rejects.toThrow()

    expect(getConversation).not.toHaveBeenCalled()
    const messages = store.getters['chat/messages']
    expect(messages[1]).toMatchObject({ isError: true })
  })

  it('replaces the error bubble with the real reply once reconciliation finds it', async () => {
    const store = makeStore()
    store.commit('chat/SET_CONVERSATION_ID', 'c1')

    sendMessage.mockRejectedValue(
      Object.assign(new Error('The assistant is taking longer than expected to respond.'), {
        isTimeout: true,
      }),
    )
    getConversation.mockResolvedValue({
      id: 'c1',
      messages: [
        { id: 'u1', role: 'user', content: 'Hi', created_at: '2026-08-11T00:00:00Z' },
        {
          id: 'a1',
          role: 'assistant',
          content: 'The MCP tool result is 42.',
          created_at: '2026-08-11T00:00:05Z',
        },
      ],
    })

    const result = await store.dispatch('chat/sendMessage', 'Hi')

    expect(result).toBeNull()
    const messages = store.getters['chat/messages']
    expect(messages).toHaveLength(2)
    expect(messages.some((message) => message.isError)).toBe(false)
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'The MCP tool result is 42.' })
    expect(store.getters['chat/chatError']).toBeNull()
  })

  it('keeps the error bubble when reconciliation finds no new assistant reply yet', async () => {
    const store = makeStore()
    store.commit('chat/SET_CONVERSATION_ID', 'c1')

    sendMessage.mockRejectedValue(
      Object.assign(new Error('The assistant is taking longer than expected to respond.'), {
        isTimeout: true,
      }),
    )
    getConversation.mockResolvedValue({
      id: 'c1',
      messages: [{ id: 'u1', role: 'user', content: 'Hi', created_at: '2026-08-11T00:00:00Z' }],
    })

    await expect(store.dispatch('chat/sendMessage', 'Hi')).rejects.toThrow()

    const messages = store.getters['chat/messages']
    expect(messages[1]).toMatchObject({ isError: true })
  })
})
