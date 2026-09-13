import httpClient from '@/core/http/httpClient'

const unwrap = (data) => data?.data ?? data

const normalizeList = (data) => {
  if (Array.isArray(data)) {
    return { items: data, currentPage: 1, lastPage: 1 }
  }

  if (!data || typeof data !== 'object') {
    return { items: [], currentPage: 1, lastPage: 1 }
  }

  const items = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : []
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {}

  return {
    items,
    currentPage: Number(meta.current_page ?? 1),
    lastPage: Number(meta.last_page ?? 1),
  }
}

// Chat transport against the Laravel agent that drives Hospitable MCP tools.
//   POST /api/chat                 -> { conversation_id, message, tool_calls[] }
//   GET  /api/conversations        -> paginated list
//   GET  /api/conversations/{id}   -> conversation + messages
export const chatService = {
  async sendMessage({ message, conversationId = null }) {
    const { data } = await httpClient.post(
      '/chat',
      {
        message,
        conversation_id: conversationId || null,
      },
      { timeout: 250000 },
    )
    return unwrap(data)
  },

  async listConversations({ perPage = 30 } = {}) {
    const { data } = await httpClient.get('/conversations', {
      params: { per_page: perPage },
    })
    return normalizeList(data)
  },

  async getConversation(id) {
    const { data } = await httpClient.get(`/conversations/${id}`, { timeout: 60000 })
    return unwrap(data)
  },
}
