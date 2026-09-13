import { beforeEach, describe, expect, it, vi } from 'vitest'
import { response } from '../helpers/httpClient.mock'

const httpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/core/http/httpClient', () => ({ default: httpClient }))

import { creationIdeasService } from '@/modules/planning/services/creationIdeas.service'

const ideaBody = {
  headline: 'Protótipo de uma ideia ainda não explorada',
  suggestion: 'A primavera favorece o crescimento e a imaginação.',
  context: { season: 'primavera', day_period: 'noite', weekday: 'domingo' },
}

describe('creationIdeasService', () => {
  beforeEach(() => {
    httpClient.get.mockReset()
    httpClient.post.mockReset()
  })

  it('requests a project idea without at or project_id', async () => {
    httpClient.get.mockReturnValue(response({ data: ideaBody }))

    await expect(creationIdeasService.get({ target: 'project' })).resolves.toMatchObject({
      headline: ideaBody.headline,
      suggestion: ideaBody.suggestion,
      target: 'project',
    })

    expect(httpClient.get).toHaveBeenCalledWith('/creation-ideas', {
      params: { target: 'project' },
    })
    expect(httpClient.post).not.toHaveBeenCalled()
  })

  it('requests a task idea with project_id and still never posts', async () => {
    httpClient.get.mockReturnValue(response({ data: ideaBody }))

    await creationIdeasService.get({ target: 'task', projectId: 9 })

    expect(httpClient.get).toHaveBeenCalledWith('/creation-ideas', {
      params: { target: 'task', project_id: 9 },
    })
    expect(JSON.stringify(httpClient.get.mock.calls)).not.toMatch(/"at"/)
    expect(httpClient.post).not.toHaveBeenCalled()
  })

  it('sends at when asking for another idea so the generator can change slot', async () => {
    httpClient.get.mockReturnValue(response({ data: ideaBody }))

    await creationIdeasService.get({
      target: 'project',
      at: '2026-09-13T23:00:00-03:00',
    })

    expect(httpClient.get).toHaveBeenCalledWith('/creation-ideas', {
      params: { target: 'project', at: '2026-09-13T23:00:00-03:00' },
    })
  })
})
