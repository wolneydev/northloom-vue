import { beforeEach, describe, expect, it, vi } from 'vitest'
import { response } from '../helpers/httpClient.mock'

const httpClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/core/http/httpClient', () => ({ default: httpClient }))

import { projectsService } from '@/modules/planning/services/projects.service'

describe('projectsService optional currency and hours', () => {
  beforeEach(() => {
    httpClient.post.mockReset()
    httpClient.put.mockReset()
  })

  it('creates with null currency and hours when they are empty', async () => {
    httpClient.post.mockReturnValue(response({ data: { id: 1, name: 'Pilot' } }))

    await projectsService.create({
      name: 'Pilot',
      starts_on: '2026-09-14',
      expected_ends_on: '2026-09-20',
      currency: '',
      hours: '',
      notes: '',
    })

    expect(httpClient.post).toHaveBeenCalledWith('/projects', {
      name: 'Pilot',
      starts_on: '2026-09-14',
      expected_ends_on: '2026-09-20',
      currency: null,
      hours: null,
      notes: null,
    })
  })

  it('updates with canonical currency and numeric hours', async () => {
    httpClient.put.mockReturnValue(response({ data: { id: 9 } }))

    await projectsService.update(9, {
      name: 'Pilot',
      starts_on: '2026-09-14',
      expected_ends_on: '2026-09-20',
      currency: 'brl',
      hours: '8',
      notes: 'x',
    })

    expect(httpClient.put).toHaveBeenCalledWith('/projects/9', {
      name: 'Pilot',
      starts_on: '2026-09-14',
      expected_ends_on: '2026-09-20',
      currency: 'BRL',
      hours: 8,
      notes: 'x',
    })
  })
})
