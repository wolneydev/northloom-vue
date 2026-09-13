# Feature Specification: Optional Currency and Project Hours

**Feature Branch**: `N/A (workspace is not a Git repository)`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Agora preciso que currency nao seja obrigatorio e tambem tenha a opção de hours por projeto (crie a pec antes da implementação e implemente em seguida)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create or edit a project without currency (Priority: P1)

An authenticated user creates or edits a project and leaves currency blank. They can
still save as long as the other required project fields (name and dates) are present.
If they do type a currency, it remains a three-letter code. Projects without currency
keep using the existing finance screens’ “needs a currency” path until a code is set.

**Why this priority**: Currency is blocking people who want to plan work before money.

**Independent Test**: Open new project, fill name and dates only, submit, and confirm
one project exists with no currency. Repeat with an invalid three-letter attempt and
confirm save is rejected. Repeat with a valid code and confirm it is stored.

**Acceptance Scenarios**:

1. **Given** a valid new-project form with name and both dates filled and currency
   empty, **When** the user submits, **Then** one project is created and currency is
   absent (not a default such as BRL).
2. **Given** the user typed a non-empty value that is not a three-letter currency
   code, **When** they submit, **Then** no project is created and the currency field
   is highlighted.
3. **Given** an existing project without currency, **When** the owner opens finances,
   **Then** they still see the existing prompt to configure currency before recording
   funds or costs.

---

### User Story 2 - Record optional hours on a project (Priority: P1)

An authenticated user can set an optional hours estimate on create or edit. Hours are
a non-negative number. Empty hours means “not specified.” The saved value is visible
on the project detail view so planning effort is visible without opening edit.

**Why this priority**: Hours is the new project attribute requested alongside optional
currency.

**Independent Test**: Create a project with hours set, confirm the value appears on
detail. Create another with hours blank, confirm no hours figure is required and none
is shown as zero unless the user entered zero.

**Acceptance Scenarios**:

1. **Given** a valid project form, **When** the user enters a non-negative hours value
   and submits, **Then** the project is saved with that hours figure and the detail
   view shows it.
2. **Given** a valid project form, **When** hours is left empty and the user submits,
   **Then** the project is saved without an hours figure.
3. **Given** the user entered a negative hours value, **When** they submit, **Then**
   the save is rejected and hours is highlighted.
4. **Given** an existing project with hours, **When** the owner opens edit, **Then**
   the hours field shows the saved value and can be cleared or changed.

---

### Edge Cases

- Empty currency and empty hours must not be coerced to a default code or to `0`
  unless the user typed zero hours.
- Whitespace-only currency is treated as empty.
- Finance flows remain blocked until a valid currency exists (existing behavior).
- Idea prefilling of name/notes is unchanged and must not fill currency or hours.
- Edit must not invent hours or currency that were not saved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create and update a project without providing
  currency.
- **FR-002**: When currency is provided, it MUST remain a three-letter ISO code
  (same strictness as today for non-empty values).
- **FR-003**: Empty currency MUST be persisted as “not set,” not as a default code.
- **FR-004**: Users MUST be able to optionally provide project hours as a
  non-negative number on create and edit.
- **FR-005**: Empty hours MUST mean unspecified; a typed `0` MUST be stored as zero.
- **FR-006**: Invalid hours (negative or non-numeric when filled) MUST prevent save.
- **FR-007**: Project detail MUST show hours when they are set.
- **FR-008**: Existing finance screens MUST keep requiring a configured currency
  before money is recorded.
- **FR-009**: Create/update MUST use the existing project persist operations with
  the optional currency and hours values (no second persist path).

### Architecture and Integration Impact *(mandatory)*

- **Owning Module**: `planning` (project form, detail, project service/types).
- **Affected Layers**: Project form page, project detail page, `projects` Vuex
  module (pass-through), `projects.service` payload mapping, `planning.types`
  Project shape, component/contract tests.
- **API Contract Impact**: `POST /api/projects` and `PUT /api/projects/{id}` send
  `currency` as a three-letter code or `null`, and `hours` as a number or `null`.
  The published OpenAPI still lists currency as required and omits hours; this
  frontend change assumes the Laravel project resource accepts optional currency
  and optional `hours`. If the API rejects those payloads, the form surfaces the
  existing field errors.
- **Security Impact**: Unchanged authenticated project ownership.
- **Domain Mapping Impact**: Project type gains nullable `currency` and nullable
  `hours`. Normalize empty strings at the service boundary.

### Key Entities

- **Project**: Name and dates remain required. Currency is optional. Hours is an
  optional non-negative estimate of effort for the project as a whole (not a task
  timesheet).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of create tests that omit currency succeed when name and dates
  are valid, and the stored currency is empty/null.
- **SC-002**: 100% of tests with an invalid filled currency reject save with zero
  new projects.
- **SC-003**: 100% of tests that submit a non-negative hours value persist and
  display that value on detail.
- **SC-004**: 100% of tests that leave hours empty persist unspecified hours (not
  an implied zero unless typed).

## Assumptions

- Hours is a project-level estimate, not per-task tracking, invoicing, or calendar
  duration.
- Hours may be whole or fractional (for example 1.5); the form accepts a numeric
  input.
- Backend will accept `currency: null` and `hours: null|number`. Until then, API
  validation messages appear on the form.
- Idea generation, tasks, funds, and costs are out of scope except the existing
  missing-currency finance guard.
