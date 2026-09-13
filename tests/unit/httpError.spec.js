import { describe, expect, it } from 'vitest'
import { HttpError, normalizeHttpError } from '@/core/http/httpError'

describe('normalizeHttpError', () => {
  it('passes an existing HttpError through unchanged', () => {
    const error = new HttpError('Already normalized.', { status: 400 })
    expect(normalizeHttpError(error)).toBe(error)
  })

  it('extracts the server message for a non-2xx response', () => {
    const error = { response: { status: 422, data: { message: 'Invalid payload.' } } }
    const result = normalizeHttpError(error)
    expect(result).toBeInstanceOf(HttpError)
    expect(result.message).toBe('Invalid payload.')
    expect(result.status).toBe(422)
    expect(result.isTimeout).toBe(false)
  })

  it('flags an axios client timeout distinctly from a lost connection', () => {
    const error = Object.assign(new Error('timeout of 250000ms exceeded'), {
      code: 'ECONNABORTED',
      request: {},
    })

    const result = normalizeHttpError(error)

    expect(result.isTimeout).toBe(true)
    expect(result.message).toMatch(/taking longer than expected/i)
    expect(result.message).not.toMatch(/could not connect/i)
  })

  it('falls back to a generic connectivity message when no response and no timeout code are present', () => {
    const error = Object.assign(new Error('Network Error'), { request: {} })

    const result = normalizeHttpError(error)

    expect(result.isTimeout).toBe(false)
    expect(result.message).toMatch(/could not connect/i)
  })
})
