import httpClient from '@/core/http/httpClient'
import {
  normalizeProjectCurrency,
  normalizeProjectHours,
} from '@/modules/planning/types/planning.types'

// Laravel resource controllers commonly wrap payloads in `{ data: ... }`.
// Unwrap defensively so callers always receive the bare model/collection.
const unwrap = (data) => data?.data ?? data

/**
 * Normalize list payloads from the Laravel API.
 *
 * Resource::collection(paginator) returns:
 *   { data: [...], links: {...}, meta: { current_page, last_page, ... } }
 *
 * Do NOT unwrap `data` first — that discards `meta`/`current_page` and makes
 * listAll() stop after page 1 (default per_page is 15).
 */
export const normalizeList = (data) => {
  if (Array.isArray(data)) {
    return { items: data, currentPage: 1, lastPage: 1 }
  }

  if (!data || typeof data !== 'object') {
    return { items: [], currentPage: 1, lastPage: 1 }
  }

  const candidates = [data, data.data].filter(
    (value) => value && typeof value === 'object' && !Array.isArray(value),
  )

  for (const candidate of candidates) {
    const items = Array.isArray(candidate.items)
      ? candidate.items
      : Array.isArray(candidate.data)
        ? candidate.data
        : null
    if (!items) continue

    const meta = candidate.meta && typeof candidate.meta === 'object' ? candidate.meta : {}
    return {
      items,
      currentPage: Number(
        candidate.currentPage ??
          candidate.current_page ??
          meta.currentPage ??
          meta.current_page ??
          1,
      ),
      lastPage: Number(
        candidate.lastPage ?? candidate.last_page ?? meta.lastPage ?? meta.last_page ?? 1,
      ),
    }
  }

  if (Array.isArray(data.data)) {
    return { items: data.data, currentPage: 1, lastPage: 1 }
  }

  return { items: [], currentPage: 1, lastPage: 1 }
}

const toProjectBody = (payload) => {
  const hours = normalizeProjectHours(payload.hours)
  return {
    name: payload.name,
    starts_on: payload.starts_on,
    expected_ends_on: payload.expected_ends_on,
    currency: normalizeProjectCurrency(payload.currency),
    hours: Number.isFinite(hours) ? hours : null,
    notes: payload.notes || null,
  }
}

// Transport layer for the projects domain.
//   GET    /api/projects
//   POST   /api/projects
//   GET    /api/projects/{id}
//   PUT    /api/projects/{id}
//   DELETE /api/projects/{id}
// currency and hours are optional; empty values are sent as null.
export const projectsService = {
  async list({ page = '', perPage = '' } = {}) {
    const { data } = await httpClient.get('/projects', {
      params: Object.fromEntries(
        Object.entries({ page, per_page: perPage }).filter(
          ([, value]) => value !== '' && value != null,
        ),
      ),
    })
    return normalizeList(data)
  },

  async listAll(filters = {}) {
    const firstPage = await this.list({ ...filters, page: 1 })
    const projects = [...firstPage.items]

    for (let page = firstPage.currentPage + 1; page <= firstPage.lastPage; page += 1) {
      const nextPage = await this.list({ ...filters, page })
      projects.push(...nextPage.items)
    }

    return projects
  },

  async get(id) {
    const { data } = await httpClient.get(`/projects/${id}`)
    return unwrap(data)
  },

  async create(payload) {
    const { data } = await httpClient.post('/projects', toProjectBody(payload))
    return unwrap(data)
  },

  async update(id, payload) {
    const { data } = await httpClient.put(`/projects/${id}`, toProjectBody(payload))
    return unwrap(data)
  },

  async remove(id) {
    await httpClient.delete(`/projects/${id}`)
  },
}
