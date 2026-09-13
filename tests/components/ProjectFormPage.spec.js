import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({ params: {} }))
const push = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}))

import ProjectFormPage from '@/modules/planning/pages/ProjectFormPage.vue'
import { SUGGEST_ANOTHER_LABEL } from '@/modules/planning/types/creation-idea.types'

const sundayNightIdea = {
  headline: 'Protótipo de uma ideia ainda não explorada',
  suggestion:
    'A primavera favorece o crescimento e a imaginação. Valide uma versão pequena na semana que vem.',
  contextLine: 'primavera · noite · domingo',
}

const otherIdea = {
  headline: 'Outra ideia de protótipo',
  suggestion: 'Uma sugestão diferente para o momento atual.',
  contextLine: 'primavera · manhã · segunda',
}

const makeStore = ({ idea = sundayNightIdea, ideaError = '', saving = false } = {}) => {
  const getters = reactive({
    'projects/isSaving': saving,
    'creationIdeas/isIdeaLoading': false,
    'creationIdeas/ideaError': ideaError,
    'creationIdeas/currentIdea': idea,
  })
  const dispatch = vi.fn((action) => {
    if (action === 'creationIdeas/fetchIdea' || action === 'creationIdeas/refreshIdea') {
      return Promise.resolve(getters['creationIdeas/currentIdea'])
    }
    if (action === 'projects/createProject') {
      return Promise.resolve({ id: 42, name: 'Edited name' })
    }
    if (action === 'projects/fetchProject') {
      return Promise.resolve({
        id: 5,
        name: 'Saved project',
        starts_on: '2026-01-01',
        expected_ends_on: '2026-02-01',
        currency: 'USD',
        hours: 12,
        notes: 'Saved notes',
      })
    }
    return Promise.resolve()
  })
  return reactive({ getters, dispatch })
}

const mountPage = (store = makeStore()) => ({
  store,
  wrapper: mount(ProjectFormPage, {
    global: {
      provide: { store },
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  }),
})

describe('ProjectFormPage creation idea', () => {
  beforeEach(() => {
    route.params = {}
    push.mockReset()
  })

  it('prefills name and notes from the idea and leaves currency and dates empty', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith('creationIdeas/fetchIdea', { target: 'project' })
    expect(store.dispatch).not.toHaveBeenCalledWith('projects/createProject', expect.anything())
    expect(wrapper.get('#name').element.value).toBe(sundayNightIdea.headline)
    expect(wrapper.get('#notes').element.value).toBe(sundayNightIdea.suggestion)
    expect(wrapper.get('#currency').element.value).toBe('')
    expect(wrapper.get('#starts_on').element.value).toBe('')
    expect(wrapper.get('#expected_ends_on').element.value).toBe('')
    expect(wrapper.text()).toContain(sundayNightIdea.contextLine)
    expect(wrapper.text()).not.toContain('As estações e o recorte dia/noite são criativos, não ciência.')
  })

  it('replaces name and notes when suggesting another idea without creating', async () => {
    const store = makeStore({ idea: sundayNightIdea })
    const { wrapper } = mountPage(store)
    await flushPromises()

    store.getters['creationIdeas/currentIdea'] = otherIdea
    store.dispatch.mockImplementation((action) => {
      if (action === 'creationIdeas/refreshIdea') return Promise.resolve(otherIdea)
      return Promise.resolve()
    })

    await wrapper.get('button.idea-hint__refresh').trigger('click')
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith('creationIdeas/refreshIdea', { target: 'project' })
    expect(wrapper.get('#name').element.value).toBe(otherIdea.headline)
    expect(wrapper.get('#notes').element.value).toBe(otherIdea.suggestion)
    expect(store.dispatch.mock.calls.some(([action]) => action === 'projects/createProject')).toBe(
      false,
    )
  })

  it('keeps edits after a failed create and does not refetch the idea', async () => {
    const store = makeStore()
    store.dispatch.mockImplementation((action) => {
      if (action === 'creationIdeas/fetchIdea') return Promise.resolve(sundayNightIdea)
      if (action === 'projects/createProject') {
        return Promise.reject(
          Object.assign(new Error('Invalid.'), {
            data: { errors: { currency: ['Required.'] } },
          }),
        )
      }
      return Promise.resolve()
    })
    const { wrapper } = mountPage(store)
    await flushPromises()

    await wrapper.get('#name').setValue('Edited name')
    await wrapper.get('#notes').setValue('Edited notes')
    await wrapper.get('#currency').setValue('BRL')
    await wrapper.get('#starts_on').setValue('2026-09-14')
    await wrapper.get('#expected_ends_on').setValue('2026-09-20')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#name').element.value).toBe('Edited name')
    expect(wrapper.get('#notes').element.value).toBe('Edited notes')
    const ideaFetches = store.dispatch.mock.calls.filter(
      ([action]) => action === 'creationIdeas/fetchIdea',
    )
    expect(ideaFetches).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('creates one project with submitted values and opens the detail view', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()

    await wrapper.get('#name').setValue('Edited name')
    await wrapper.get('#currency').setValue('brl')
    await wrapper.get('#starts_on').setValue('2026-09-14')
    await wrapper.get('#expected_ends_on').setValue('2026-09-20')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith(
      'projects/createProject',
      expect.objectContaining({
        name: 'Edited name',
        currency: 'BRL',
        starts_on: '2026-09-14',
        expected_ends_on: '2026-09-20',
      }),
    )
    expect(push).toHaveBeenCalledWith('/projects/42')
  })

  it('creates a project without currency when name and dates are present', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()

    await wrapper.get('#name').setValue('No money yet')
    await wrapper.get('#starts_on').setValue('2026-09-14')
    await wrapper.get('#expected_ends_on').setValue('2026-09-20')
    await wrapper.get('#hours').setValue('40')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith(
      'projects/createProject',
      expect.objectContaining({
        name: 'No money yet',
        currency: '',
        hours: 40,
      }),
    )
    expect(push).toHaveBeenCalledWith('/projects/42')
  })

  it('rejects negative hours before dispatch', async () => {
    const { wrapper, store } = mountPage()
    await flushPromises()

    await wrapper.get('#name').setValue('Bad hours')
    await wrapper.get('#starts_on').setValue('2026-09-14')
    await wrapper.get('#expected_ends_on').setValue('2026-09-20')
    await wrapper.get('#hours').setValue('-1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.dispatch).not.toHaveBeenCalledWith('projects/createProject', expect.anything())
    expect(wrapper.text()).toMatch(/non-negative/i)
  })

  it('does not load an idea when editing an existing project', async () => {
    route.params = { id: '5' }
    const { wrapper, store } = mountPage()
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith('projects/fetchProject', '5')
    expect(store.dispatch).not.toHaveBeenCalledWith(
      'creationIdeas/fetchIdea',
      expect.anything(),
    )
    expect(wrapper.get('#name').element.value).toBe('Saved project')
    expect(wrapper.get('#notes').element.value).toBe('Saved notes')
    expect(wrapper.get('#hours').element.value).toBe('12')
    expect(wrapper.text()).not.toContain(SUGGEST_ANOTHER_LABEL)
  })

  it('stays usable when the idea cannot be loaded', async () => {
    const store = makeStore({ idea: null, ideaError: 'Não foi possível carregar a sugestão.' })
    store.dispatch.mockImplementation((action) => {
      if (action === 'creationIdeas/fetchIdea') return Promise.resolve(null)
      return Promise.resolve()
    })
    const { wrapper } = mountPage(store)
    await flushPromises()

    expect(wrapper.get('#name').element.value).toBe('')
    expect(wrapper.get('#notes').element.value).toBe('')
    expect(wrapper.text()).toMatch(/Não foi possível carregar/)
  })
})
