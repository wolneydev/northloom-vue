import httpClient from '@/core/http/httpClient'
import { mapCreationIdea } from '@/modules/planning/types/creation-idea.types'

// Transport for the read-only creation-idea capability.
//   GET /api/creation-ideas?target=project|task&project_id=&at=
// Must never POST. `at` is only sent when the user asks for another idea so
// the deterministic generator can use a different Brazil-local slot.
export const creationIdeasService = {
  async get({ target, projectId, at } = {}) {
    const params = { target }
    if (target === 'task' && projectId != null && projectId !== '') {
      params.project_id = projectId
    }
    if (at) {
      params.at = at
    }

    const { data } = await httpClient.get('/creation-ideas', { params })
    return mapCreationIdea(data, { target, projectId: projectId ?? null })
  },
}
