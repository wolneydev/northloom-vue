import { describe, expect, it } from 'vitest'
import {
  IDEA_HEADLINE_MAX_LENGTH,
  brazilSeason,
  brazilSymbolicContext,
  clampHeadline,
  formatIdeaContextLine,
  ideaRefreshAt,
  mapCreationIdea,
} from '@/modules/planning/types/creation-idea.types'

const sundayAfternoon = new Date('2026-09-13T15:00:00-03:00')

const sundayNightPayload = {
  data: {
    headline: 'Protótipo de uma ideia ainda não explorada',
    suggestion:
      'A primavera favorece o crescimento e a imaginação. Valide uma versão pequena na semana que vem.',
    context: {
      season: 'spring',
      day_period: 'afternoon',
      weekday: 'sunday',
    },
    field_hints: {
      headline: 'name',
      suggestion: 'notes',
    },
  },
}

describe('Brazil symbolic context', () => {
  it('treats 13 Sep in America/Sao_Paulo as winter afternoon on Sunday', () => {
    expect(brazilSymbolicContext(sundayAfternoon)).toEqual({
      season: 'inverno',
      dayPeriod: 'tarde',
      weekday: 'domingo',
      contextLine: 'inverno · tarde · domingo',
    })
  })

  it('uses southern-hemisphere astronomical season bounds', () => {
    expect(brazilSeason(9, 13)).toBe('inverno')
    expect(brazilSeason(9, 22)).toBe('inverno')
    expect(brazilSeason(9, 23)).toBe('primavera')
    expect(brazilSeason(12, 21)).toBe('verão')
    expect(brazilSeason(3, 21)).toBe('outono')
    expect(brazilSeason(6, 21)).toBe('inverno')
  })

  it('formats a Brazil-offset at value eight hours later for the next suggestion', () => {
    expect(ideaRefreshAt(1, sundayAfternoon)).toBe('2026-09-13T23:00:00-03:00')
  })
})

describe('creation idea mapping', () => {
  it('keeps API headline/suggestion but frames context for Brazil, not northern English labels', () => {
    const idea = mapCreationIdea(sundayNightPayload, {
      target: 'project',
      now: sundayAfternoon,
    })

    expect(idea).toMatchObject({
      headline: 'Protótipo de uma ideia ainda não explorada',
      suggestion:
        'A primavera favorece o crescimento e a imaginação. Valide uma versão pequena na semana que vem.',
      season: 'inverno',
      dayPeriod: 'tarde',
      weekday: 'domingo',
      contextLine: 'inverno · tarde · domingo',
      target: 'project',
    })
  })

  it('falls back to headline and suggestion when field_hints are absent', () => {
    const idea = mapCreationIdea(
      {
        headline: 'Título direto',
        suggestion: 'Texto longo',
        context: { season: 'spring', period: 'afternoon', weekday: 'sunday' },
      },
      { now: sundayAfternoon },
    )

    expect(idea.headline).toBe('Título direto')
    expect(idea.suggestion).toBe('Texto longo')
    expect(idea.contextLine).toBe('inverno · tarde · domingo')
  })

  it('clamps headlines to 255 characters', () => {
    const long = 'á'.repeat(IDEA_HEADLINE_MAX_LENGTH + 20)
    expect(clampHeadline(long)).toHaveLength(IDEA_HEADLINE_MAX_LENGTH)
    expect(mapCreationIdea({ headline: long }, { now: sundayAfternoon }).headline).toHaveLength(
      IDEA_HEADLINE_MAX_LENGTH,
    )
  })

  it('still formats an explicit context line helper', () => {
    expect(formatIdeaContextLine({})).toBe('')
    expect(formatIdeaContextLine({ season: 'inverno', dayPeriod: 'tarde', weekday: 'domingo' })).toBe(
      'inverno · tarde · domingo',
    )
  })
})
