import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/planning/services/tasks.service', () => ({
  tasksService: { get: vi.fn() },
}))

import TaskFormModal from '@/modules/planning/components/TaskFormModal.vue'

const idea = {
  headline: 'Tarefa sugerida',
  suggestion: 'Notas sugeridas para a tarefa.',
  contextLine: 'primavera · noite · domingo',
}

const otherIdea = {
  headline: 'Outra tarefa',
  suggestion: 'Outras notas.',
  contextLine: 'primavera · tarde · segunda',
}

const projects = [{ id: 7, name: 'Owned project' }]

const makeStore = ({
  ideaValue = idea,
  forbidden = false,
  ideaError = '',
} = {}) => {
  const getters = reactive({
    'creationIdeas/isIdeaLoading': false,
    'creationIdeas/isIdeaForbidden': forbidden,
    'creationIdeas/ideaError': ideaError,
    'creationIdeas/currentIdea': ideaValue,
  })
  const dispatch = vi.fn((action) => {
    if (action === 'creationIdeas/fetchIdea' || action === 'creationIdeas/refreshIdea') {
      if (forbidden) {
        return Promise.reject(Object.assign(new Error('Forbidden.'), { status: 403 }))
      }
      return Promise.resolve(getters['creationIdeas/currentIdea'])
    }
    if (action === 'tasks/createTask') return Promise.resolve({ id: 1 })
    return Promise.resolve()
  })
  return reactive({ getters, dispatch })
}

const mountModal = (props = {}, store = makeStore()) => ({
  store,
  wrapper: mount(TaskFormModal, {
    props: {
      open: true,
      task: null,
      projects,
      lockedProjectId: 7,
      ...props,
    },
    global: {
      provide: { store },
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  }),
})

describe('TaskFormModal creation idea', () => {
  it('prefills title and notes for an owned project without creating a task', async () => {
    const { wrapper, store } = mountModal()
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith('creationIdeas/fetchIdea', {
      target: 'task',
      projectId: 7,
    })
    expect(store.dispatch.mock.calls.some(([action]) => action === 'tasks/createTask')).toBe(false)
    expect(wrapper.get('#task-title').element.value).toBe(idea.headline)
    expect(wrapper.get('#task-notes').element.value).toBe(idea.suggestion)
    expect(wrapper.get('#task-date').element.value).toBe('')
    expect(wrapper.get('#task-start').element.value).toBe('')
    expect(wrapper.get('#task-project').element.disabled).toBe(true)
    expect(wrapper.text()).toContain(idea.contextLine)
    expect(wrapper.text()).not.toContain('As estações e o recorte dia/noite são criativos, não ciência.')
  })

  it('refreshes title and notes without creating a task', async () => {
    const store = makeStore()
    const { wrapper } = mountModal({}, store)
    await flushPromises()

    store.getters['creationIdeas/currentIdea'] = otherIdea
    store.dispatch.mockImplementation((action) => {
      if (action === 'creationIdeas/refreshIdea') return Promise.resolve(otherIdea)
      return Promise.resolve()
    })

    await wrapper.get('button.idea-hint__refresh').trigger('click')
    await flushPromises()

    expect(wrapper.get('#task-title').element.value).toBe(otherIdea.headline)
    expect(store.dispatch.mock.calls.some(([action]) => action === 'tasks/createTask')).toBe(false)
  })

  it('creates one task with submitted schedule fields', async () => {
    const { wrapper, store } = mountModal()
    await flushPromises()

    await wrapper.get('#task-title').setValue('Edited task')
    await wrapper.get('#task-date').setValue('2026-09-14')
    await wrapper.get('#task-start').setValue('09:30')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith(
      'tasks/createTask',
      expect.objectContaining({
        project_id: 7,
        title: 'Edited task',
        task_date: '2026-09-14',
        starts_at: '09:30',
      }),
    )
  })

  it('denies a foreign project idea without creating a task', async () => {
    const store = makeStore({
      ideaValue: null,
      forbidden: true,
      ideaError: 'Você não pode criar tarefas neste projeto.',
    })
    const { wrapper } = mountModal({}, store)
    await flushPromises()

    expect(store.dispatch).toHaveBeenCalledWith('creationIdeas/fetchIdea', {
      target: 'task',
      projectId: 7,
    })
    expect(wrapper.text()).toMatch(/não pode criar tarefas/i)
    expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true)
    expect(store.dispatch.mock.calls.some(([action]) => action === 'tasks/createTask')).toBe(false)
  })

  it('does not apply an idea when editing a saved task', async () => {
    const store = makeStore()
    const { wrapper } = mountModal(
      {
        task: {
          id: 11,
          project_id: 7,
          title: 'Saved title',
          notes: 'Saved notes',
          task_date: '2026-09-10',
          starts_at: '10:00',
          status: 'pending',
          notify: false,
        },
      },
      store,
    )
    await flushPromises()

    expect(store.dispatch).not.toHaveBeenCalledWith(
      'creationIdeas/fetchIdea',
      expect.anything(),
    )
    expect(wrapper.get('#task-title').element.value).toBe('Saved title')
    expect(wrapper.get('#task-notes').element.value).toBe('Saved notes')
  })
})
