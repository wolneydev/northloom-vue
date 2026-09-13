import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpClientMock, response } from '../helpers/httpClient.mock'

const httpClient = createHttpClientMock()

vi.mock('@/core/http/httpClient', () => ({ default: httpClient }))

const { chatService } = await import('@/modules/chat/services/chat.service')

describe('chatService timeouts', () => {
  beforeEach(() => {
    httpClient.get.mockReset()
    httpClient.post.mockReset()
  })

  it('gives sendMessage a long timeout to cover a slow MCP/LLM round trip', async () => {
    httpClient.post.mockReturnValue(response({ data: { conversation_id: 'c1', message: 'Hi' } }))

    await chatService.sendMessage({ message: 'Hi', conversationId: null })

    expect(httpClient.post).toHaveBeenCalledWith(
      '/chat',
      { message: 'Hi', conversation_id: null },
      { timeout: 250000 },
    )
  })

  it('gives getConversation a longer-than-default timeout so reopening a conversation cannot time out faster than sending did', async () => {
    httpClient.get.mockReturnValue(response({ data: { id: 'c1', messages: [] } }))

    await chatService.getConversation('c1')

    expect(httpClient.get).toHaveBeenCalledWith('/conversations/c1', { timeout: 60000 })
  })
})
