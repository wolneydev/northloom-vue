import { describe, expect, it } from 'vitest'
import routes from '@/modules/planning/routes/planning.routes'

describe('planning create route security', () => {
  it('protects project create with the existing auth gate', () => {
    const route = routes.find((candidate) => candidate.name === 'ProjectCreate')

    expect(route).toBeDefined()
    expect(route.path).toBe('/projects/new')
    expect(route.meta).toMatchObject({ requiresAuth: true })
    expect(route.component).toBeTypeOf('function')
  })
})
