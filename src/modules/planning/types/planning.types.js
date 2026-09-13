// Domain types, option catalogs and mappers for the planning module.
// The project is plain JS, so "types" are expressed as JSDoc typedefs plus the
// runtime constants/helpers the UI relies on. Keeping them here gives a single
// source of truth shared by services, stores and components.

/**
 * @typedef {Object} Project
 * @property {number} id
 * @property {string} name
 * @property {string} starts_on            ISO date (YYYY-MM-DD)
 * @property {string} expected_ends_on     ISO date (YYYY-MM-DD)
 * @property {string|null} notes
 * @property {string|null} currency        ISO 4217 code when finances are used; optional
 * @property {number|null} hours           Optional non-negative effort estimate
 */

/**
 * @typedef {Object} Task
 * @property {number} id
 * @property {number} project_id
 * @property {string} title
 * @property {string} task_date            ISO date (YYYY-MM-DD)
 * @property {string} starts_at            Local datetime (YYYY-MM-DDTHH:mm:ss)
 * @property {string|null} ends_at         Local datetime (YYYY-MM-DDTHH:mm:ss)
 * @property {string|null} notes
 * @property {string|null} location
 * @property {TaskPriority|null} priority
 * @property {TaskStatus} status
 * @property {boolean} notify
 * @property {string|null} notify_at_datetime  Local datetime when the Telegram reminder fires
 */

/**
 * Reminder-related fields appended to a Task. Telegram delivery itself is
 * handled exclusively by the backend; the frontend only persists intent.
 * @typedef {Object} TaskReminderFields
 * @property {boolean} notify
 * @property {string|null} notify_at_datetime
 */

/**
 * @typedef {('low'|'medium'|'high')} TaskPriority
 * @typedef {('pending'|'in_progress'|'completed'|'cancelled')} TaskStatus
 */

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} start
 * @property {string|null} end
 * @property {string} backgroundColor
 * @property {string} borderColor
 * @property {string} textColor
 * @property {string[]} classNames
 * @property {Object} extendedProps
 */

// --- Status catalog ----------------------------------------------------------
// Colors are pulled from the Northloom palette (see assets/main.css) so the
// calendar stays visually consistent with the rest of the system.
export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#c9a86a', soft: '#f6eed9' },
  { value: 'in_progress', label: 'In progress', color: '#2f80ed', soft: '#e7f0ff' },
  { value: 'completed', label: 'Completed', color: '#6e8b7b', soft: '#e9efea' },
  { value: 'cancelled', label: 'Cancelled', color: '#b25a52', soft: '#f7e7e4' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6e8b7b' },
  { value: 'medium', label: 'Medium', color: '#c9a86a' },
  { value: 'high', label: 'High', color: '#b25a52' },
]


const STATUS_MAP = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s]))
const PRIORITY_MAP = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p]))

export const getStatusMeta = (value) =>
  STATUS_MAP[value] ?? { value, label: value ?? '—', color: '#8c8377', soft: '#f3ece2' }

export const getPriorityMeta = (value) =>
  value ? PRIORITY_MAP[value] ?? { value, label: value, color: '#8c8377' } : null

// --- Date / time helpers -----------------------------------------------------

/**
 * Combine a date (YYYY-MM-DD) and a time (HH:mm[:ss]) into a local datetime
 * string FullCalendar understands. Tolerates values that are already full
 * datetimes (containing a "T") so we never double-prefix the date.
 * @param {string} date
 * @param {string|null} time
 * @returns {string|null}
 */
export const combineDateTime = (date, time) => {
  if (!date) return null
  if (!time) return date
  if (time.includes('T')) return time
  const normalized = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalized}`
}

/**
 * Extract the HH:mm part from a time or datetime string, for form inputs.
 * @param {string|null} value
 * @returns {string}
 */
export const toTimeInput = (value) => {
  if (!value) return ''
  const timePart = value.includes('T') ? value.split('T')[1] : value
  return timePart.slice(0, 5)
}

/**
 * Extract the YYYY-MM-DD part from a date or datetime string.
 * @param {string|null} value
 * @returns {string}
 */
export const toDateInput = (value) => {
  if (!value) return ''
  return value.split('T')[0]
}

/**
 * Format an ISO date/datetime for display in Brazilian numeric form.
 * @param {string|null} value
 * @returns {string}
 */
export const formatDate = (value) => {
  const datePart = toDateInput(value)
  if (!datePart) return '—'
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return datePart
  return `${day}/${month}/${year}`
}

/**
 * Normalize an API datetime ("YYYY-MM-DDTHH:mm:ss" or with a space separator)
 * into the value a <input type="datetime-local"> expects ("YYYY-MM-DDTHH:mm").
 * @param {string|null} value
 * @returns {string}
 */
export const toDateTimeLocalInput = (value) => {
  if (!value) return ''
  const [datePart, timePart = ''] = value.replace(' ', 'T').split('T')
  return timePart ? `${datePart}T${timePart.slice(0, 5)}` : datePart
}

/**
 * Coerce a datetime-local value ("YYYY-MM-DDTHH:mm") into the full local
 * datetime string the API stores ("YYYY-MM-DDTHH:mm:ss"). Returns null for
 * empty input so disabled reminders are persisted as `notify_at_datetime: null`.
 * @param {string|null} value
 * @returns {string|null}
 */
export const toApiDateTime = (value) => {
  if (!value) return null
  const [datePart, timePart = ''] = value.replace(' ', 'T').split('T')
  if (!timePart) return datePart
  const [hh = '00', mm = '00', ss = '00'] = timePart.split(':')
  return `${datePart}T${hh}:${mm}:${ss}`
}

/**
 * Resolve a task's reminder datetime for display and calendar metadata.
 * @param {Task} task
 * @returns {string|null}
 */
export const taskNotifyAt = (task) => {
  if (!task?.notify) return null
  return task.notify_at_datetime ?? null
}

/**
 * Human-friendly reminder label, e.g. "Jul 20, 2026 at 2:30 PM".
 * @param {string|null} value
 * @returns {string}
 */
export const formatReminder = (value) => {
  if (!value) return ''
  const normalized = toApiDateTime(value)
  const day = formatDate(normalized)
  const time = toTimeInput(normalized)
  return time ? `${day} às ${time}` : day
}

/**
 * Map a Task (API shape) into a FullCalendar event. Status drives the event
 * color; priority is surfaced as a className so the UI can add a marker.
 * @param {Task} task
 * @param {Map<number, string>|Object} projectNames  lookup of project id -> name
 * @returns {CalendarEvent}
 */
export const taskToCalendarEvent = (task, projectNames = {}) => {
  const status = getStatusMeta(task.status)
  const projectName =
    projectNames instanceof Map
      ? projectNames.get(task.project_id)
      : projectNames[task.project_id]

  return {
    id: String(task.id),
    title: task.title,
    start: combineDateTime(task.task_date, task.starts_at),
    end: task.ends_at ? combineDateTime(task.task_date, task.ends_at) : null,
    backgroundColor: status.color,
    borderColor: status.color,
    textColor: '#fffdf9',
    classNames: [
      `task-status--${task.status}`,
      task.priority ? `task-priority--${task.priority}` : 'task-priority--none',
    ],
    extendedProps: {
      project_id: task.project_id,
      project_name: projectName ?? null,
      notes: task.notes ?? null,
      location: task.location ?? null,
      priority: task.priority ?? null,
      status: task.status,
      notify: !!task.notify,
      notify_at: taskNotifyAt(task),
    },
  }
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export const normalizeProjectCurrency = (value) => {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return code === '' ? null : code
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidProjectCurrency = (value) => {
  const code = normalizeProjectCurrency(value)
  return code === null || /^[A-Z]{3}$/.test(code)
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export const normalizeProjectHours = (value) => {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return Number.NaN
  return n
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidProjectHours = (value) => {
  const n = normalizeProjectHours(value)
  return n === null || (Number.isFinite(n) && n >= 0)
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export const formatProjectHours = (value) => {
  const n = normalizeProjectHours(value)
  if (n === null || !Number.isFinite(n)) return ''
  return n === 1 ? '1 hour' : `${n} hours`
}
