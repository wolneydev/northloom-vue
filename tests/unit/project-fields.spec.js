import { describe, expect, it } from 'vitest'
import {
  formatProjectHours,
  isValidProjectCurrency,
  isValidProjectHours,
  normalizeProjectCurrency,
  normalizeProjectHours,
} from '@/modules/planning/types/planning.types'

describe('optional project currency and hours', () => {
  it('treats blank currency as unset and accepts a three-letter code', () => {
    expect(normalizeProjectCurrency('')).toBeNull()
    expect(normalizeProjectCurrency(' brl ')).toBe('BRL')
    expect(isValidProjectCurrency('')).toBe(true)
    expect(isValidProjectCurrency('BR')).toBe(false)
    expect(isValidProjectCurrency('BRL')).toBe(true)
  })

  it('treats blank hours as unset and rejects negatives', () => {
    expect(normalizeProjectHours('')).toBeNull()
    expect(normalizeProjectHours('1,5')).toBe(1.5)
    expect(isValidProjectHours('')).toBe(true)
    expect(isValidProjectHours('0')).toBe(true)
    expect(isValidProjectHours('-1')).toBe(false)
    expect(formatProjectHours(1)).toBe('1 hour')
    expect(formatProjectHours(40)).toBe('40 hours')
    expect(formatProjectHours(null)).toBe('')
  })
})
