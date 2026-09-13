import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'vuex'
import { httpError } from '../helpers/httpClient.mock'

const getIdea = vi.hoisted(() => vi.fn())

vi.mock('@/modules/planning/services/creationIdeas.service', () => ({
  creationIdeasService: { get: getIdea },
}))

import creationIdeas from '@/modules/planning/store/creationIdeas.store'

const idea = {
  headline: 'Protótipo de uma ideia ainda não explorada',
  suggestion: 'Valide uma versão pequena na semana que vem.',
  contextLine: 'primavera · noite · domingo',
}

const makeStore = () => createStore({ modules: { creationIdeas } })

describe('creationIdeas store', () => {
  beforeEach(() => {
    getIdea.mockReset()
  })

  it('stores a mapped idea from a read-only GET', async () => {
    const store = makeStore()
    getIdea.mockResolvedValue(idea)

    await expect(
      store.dispatch('creationIdeas/fetchIdea', { target: 'project' }),
    ).resolves.toEqual(idea)

    expect(store.getters['creationIdeas/currentIdea']).toEqual(idea)
    expect(store.getters['creationIdeas/ideaError']).toBeNull()
    expect(getIdea).toHaveBeenCalledWith({ target: 'project' })
  })

  it('refreshIdea uses the same GET and does not require a persist method', async () => {
    const store = makeStore()
    getIdea.mockResolvedValue({ ...idea, headline: 'Outra ideia' })

    await store.dispatch('creationIdeas/refreshIdea', { target: 'project' })

    expect(store.getters['creationIdeas/currentIdea'].headline).toBe('Outra ideia')
    expect(getIdea).toHaveBeenCalledWith({
      target: 'project',
      at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
    })
    expect(getIdea).toHaveBeenCalledTimes(1)
  })

  it('treats load failures as non-blocking', async () => {
    const store = makeStore()
    getIdea.mockRejectedValue(httpError({ message: 'down', status: 500 }))

    await expect(store.dispatch('creationIdeas/fetchIdea', { target: 'project' })).resolves.toBeNull()

    expect(store.getters['creationIdeas/currentIdea']).toBeNull()
    expect(store.getters['creationIdeas/ideaError']).toBeTruthy()
    expect(store.getters['creationIdeas/isIdeaForbidden']).toBe(false)
  })

  it('marks 403 as forbidden and rethrows so task create can deny access', async () => {
    const store = makeStore()
    getIdea.mockRejectedValue(httpError({ message: 'Forbidden.', status: 403 }))

    await expect(
      store.dispatch('creationIdeas/fetchIdea', { target: 'task', projectId: 3 }),
    ).rejects.toMatchObject({ status: 403 })

    expect(store.getters['creationIdeas/isIdeaForbidden']).toBe(true)
    expect(store.getters['creationIdeas/currentIdea']).toBeNull()
  })
})
