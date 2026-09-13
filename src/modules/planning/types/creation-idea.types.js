// Domain mapping for the read-only creation idea returned by the Laravel API.
// Headline/suggestion stay as the API sent them. The symbolic context line is
// framed for Brazil (America/Sao_Paulo, southern-hemisphere astronomical
// seasons) so a northern-hemisphere English payload such as
// "spring · afternoon · sunday" is not shown in September as primavera.

export const IDEA_HEADLINE_MAX_LENGTH = 255

export const SUGGEST_ANOTHER_LABEL = 'Sugerir outra ideia'

export const IDEA_LOAD_FAILURE_MESSAGE =
  'Não foi possível carregar a sugestão. Você pode preencher o formulário manualmente.'

export const IDEA_FORBIDDEN_MESSAGE = 'Você não pode criar tarefas neste projeto.'

/**
 * @typedef {Object} CreationIdea
 * @property {string} headline
 * @property {string} suggestion
 * @property {string} season
 * @property {string} dayPeriod
 * @property {string} weekday
 * @property {string} contextLine
 * @property {'project'|'task'|null} target
 * @property {number|null} projectId
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export const clampHeadline = (value) => {
  const text = String(value ?? '')
  return text.length > IDEA_HEADLINE_MAX_LENGTH ? text.slice(0, IDEA_HEADLINE_MAX_LENGTH) : text
}

/**
 * @param {{ season?: string, dayPeriod?: string, weekday?: string }} parts
 * @returns {string}
 */
export const formatIdeaContextLine = ({ season = '', dayPeriod = '', weekday = '' } = {}) =>
  [season, dayPeriod, weekday].map((part) => String(part).trim()).filter(Boolean).join(' · ')

/** Civil calendar used for the creative season / day-period / weekday line. */
export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

const WEEKDAY_PT = {
  0: 'domingo',
  1: 'segunda',
  2: 'terça',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sábado',
}

const brazilDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIME_ZONE,
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)

  const read = (type) => parts.find((part) => part.type === type)?.value
  const weekdayShort = read('weekday')
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayShort)

  return {
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    weekdayIndex: weekdayIndex === -1 ? date.getDay() : weekdayIndex,
  }
}

/**
 * Southern-hemisphere astronomical season in Brazil.
 * Inverno runs through 22 Sep; primavera starts 23 Sep.
 * @param {number} month 1-12
 * @param {number} day
 * @returns {string}
 */
export const brazilSeason = (month, day) => {
  const md = month * 100 + day
  if (md >= 1221 || md <= 320) return 'verão'
  if (md <= 620) return 'outono'
  if (md <= 922) return 'inverno'
  return 'primavera'
}

/**
 * @param {number} hour 0-23 in America/Sao_Paulo
 * @returns {string}
 */
export const brazilDayPeriod = (hour) => {
  if (hour < 6) return 'madrugada'
  if (hour < 12) return 'manhã'
  if (hour < 18) return 'tarde'
  return 'noite'
}

/**
 * Symbolic context for the current moment in Brazil. Used for the form hint
 * instead of echoing northern-hemisphere English labels from the API.
 * @param {Date} [now]
 * @returns {{ season: string, dayPeriod: string, weekday: string, contextLine: string }}
 */
export const brazilSymbolicContext = (now = new Date()) => {
  const { month, day, hour, weekdayIndex } = brazilDateParts(now)
  const season = brazilSeason(month, day)
  const dayPeriod = brazilDayPeriod(hour)
  const weekday = WEEKDAY_PT[weekdayIndex] ?? ''
  return {
    season,
    dayPeriod,
    weekday,
    contextLine: formatIdeaContextLine({ season, dayPeriod, weekday }),
  }
}

/**
 * ISO local datetime with Brazil offset, matching the API `at` example
 * (`2026-09-13T21:30:00-03:00`).
 * @param {Date} [date]
 * @returns {string}
 */
export const formatBrazilOffsetDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type) => parts.find((part) => part.type === type)?.value
  return `${read('year')}-${read('month')}-${read('day')}T${read('hour')}:${read('minute')}:${read('second')}-03:00`
}

/** Each "suggest another" click asks the API for a different Brazil-local slot. */
export const IDEA_REFRESH_STEP_MS = 8 * 60 * 60 * 1000

/**
 * @param {number} nudge 1-based refresh count
 * @param {Date} [now]
 * @returns {string}
 */
export const ideaRefreshAt = (nudge, now = new Date()) =>
  formatBrazilOffsetDateTime(new Date(now.getTime() + Number(nudge) * IDEA_REFRESH_STEP_MS))

const unwrapPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data
  }
  return payload
}

/**
 * Map an API idea payload into the planning-module CreationIdea shape.
 * @param {object|null} payload
 * @param {{ target?: 'project'|'task', projectId?: number|null, now?: Date }} [meta]
 * @returns {CreationIdea|null}
 */
export const mapCreationIdea = (payload, { target = null, projectId = null, now = new Date() } = {}) => {
  const raw = unwrapPayload(payload)
  if (!raw) return null

  const headline = clampHeadline(raw.headline ?? raw.title ?? '')
  const suggestion = String(raw.suggestion ?? raw.notes ?? '')
  const { season, dayPeriod, weekday, contextLine } = brazilSymbolicContext(now)

  return {
    headline,
    suggestion,
    season,
    dayPeriod,
    weekday,
    contextLine,
    target: target ?? raw.target ?? null,
    projectId: projectId ?? raw.project_id ?? null,
  }
}
