# Feature Specification: Creation Idea Form

**Feature Branch**: `N/A (workspace is not a Git repository)`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Create a feature spec from the Laravel Hospitable task `12-creation-idea-form.md`: an authenticated user opening create-project (and create-task) sees a Portuguese idea already in name/title and notes, can edit or refresh the idea without persisting, then submits existing required fields so one project or task is created through the existing create flow. Guests are sent to login. Idea generation remains read-only; creating still uses the existing project/task create operations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a project from a prefilled idea (Priority: P1)

An authenticated user opens the new-project screen and immediately sees a suggested
project name and notes already filled in. They also see a short symbolic context line
(season, time of day, weekday) presented as creative copy, not as scientific
astrology. Currency and start/end dates remain empty until the user provides them.
The user may edit the suggestion, request another idea, then submit. One project is
created from the submitted values.

**Why this priority**: Creating a project is the primary gap: idea copy already exists
on the backend, but the browser create flow does not show it, so users never benefit
from the suggestion when they actually start a project.

**Independent Test**: Sign in, open new project, confirm name and notes are prefilled
and no project exists yet, fill currency and dates, submit, and confirm exactly one
project exists with the submitted name (including any edits).

**Acceptance Scenarios**:

1. **Given** an authenticated user and a known moment corresponding to Sunday night in
   spring (local calendar `2026-09-13 21:30` in America/Sao_Paulo), **When** they open
   the new-project screen, **Then** the name field contains
   `Protótipo de uma ideia ainda não explorada`, the notes field contains the matching
   Portuguese suggestion about growth, imagination, and validating a small version in
   the coming week, currency and dates remain empty and still required to submit, and
   no project row is created by opening the screen.
2. **Given** the new-project screen with a suggestion loaded, **When** the user edits
   the name and/or notes, supplies currency and both dates, and submits, **Then** they
   are taken to the created project's detail view and exactly one project exists for
   that user with the edited name preserved (not a regenerated idea).
3. **Given** the new-project screen, **When** the user chooses to suggest another idea,
   **Then** name and notes are replaced with a fresh suggestion for the current moment,
   still without creating a project.
4. **Given** a validation failure (missing currency or dates), **When** the form is
   redisplayed, **Then** the user's edits remain and the idea is not regenerated.
5. **Given** a guest (no session), **When** they try to open the new-project screen,
   **Then** they are sent to the existing sign-in screen.

---

### User Story 2 - Create a task from a prefilled idea (Priority: P2)

An authenticated owner of a project opens the new-task flow for that project and sees
a task idea already in the title and notes. They still provide the task date and start
time. Opening the form does not create a task. A user who does not own the project
cannot open this flow.

**Why this priority**: Task creation is the same product pattern as projects and
reuses the same idea capability with a project context, but it depends on an existing
owned project.

**Independent Test**: As the project owner, open new task for that project, confirm
title/notes are prefilled and no task is created yet, submit required schedule fields,
and confirm one task exists. Repeat as a non-owner and confirm access is denied.

**Acceptance Scenarios**:

1. **Given** an authenticated owner of a project, **When** they open the new-task
   screen for that project, **Then** title is prefilled from the idea headline, notes
   from the suggestion, the project is fixed (the user does not pick another project),
   they still fill task date and start time, and no task is created by opening the
   screen.
2. **Given** a valid prefilled task form, **When** the owner submits required fields,
   **Then** one task is created on that project using the submitted values.
3. **Given** a project owned by someone else, **When** a signed-in user tries to open
   the new-task idea flow for it, **Then** they are denied (forbidden), with no task
   created.
4. **Given** the new-task screen, **When** the user suggests another idea, **Then**
   title and notes refresh without creating a task.

---

### User Story 3 - Understand the suggestion as creative context (Priority: P3)

While creating a project or task, the user can tell that the idea is tied to a
symbolic seasonal/time-of-day/weekday frame and that this frame is creative, not
scientific.

**Why this priority**: The idea is only useful if users understand it as optional
inspiration rather than a factual or astrological claim.

**Independent Test**: Open new project (or new task) and confirm a short context line
plus a one-line disclaimer are visible without extra navigation.

**Acceptance Scenarios**:

1. **Given** a loaded idea, **When** the user views the create form, **Then** they see
   a short symbolic context line (season, day period, weekday) as ordinary copy.
2. **Given** a loaded idea, **When** the user views the create form, **Then** they see
   a single small-print disclaimer that seasons and day-night framing are creative,
   not science.

---

### Edge Cases

- Opening create project or create task must never persist a project or task.
- Failed submit must keep the user's current field values and must not fetch a new
  idea as a side effect of the failed submit.
- Headline/name/title remains limited to 255 characters.
- Suggesting another idea uses the current moment (no user-facing clock override).
- Idea load failure must not block the user from filling the form manually and
  creating a project or task.
- Edit-project and edit-task flows must not replace existing saved values with a
  new idea.
- Existing create-project and create-task operations used by other clients remain
  unchanged; this feature only consumes the existing read-only idea capability.
- Guest access continues to use the application's existing sign-in gate; this feature
  does not add a second login product.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Authenticated users MUST be able to open a new-project screen that
  presents a creation idea with the headline already in the project name and the
  suggestion already in notes.
- **FR-002**: The new-project screen MUST leave currency, start date, and expected end
  date empty until the user provides them, and those fields MUST remain required to
  create a project.
- **FR-003**: Opening the new-project screen MUST NOT create a project.
- **FR-004**: Users MUST be able to request another project idea, which replaces name
  and notes with a new suggestion for the current moment without creating a project.
- **FR-005**: Submitting a valid new-project form MUST create exactly one project
  through the existing project-create capability and then show that project's detail
  view.
- **FR-006**: After a failed project create, the form MUST redisplay with the user's
  submitted values intact and MUST NOT regenerate the idea.
- **FR-007**: Guests MUST be redirected to the existing sign-in experience when they
  try to open protected create screens.
- **FR-008**: Authenticated owners MUST be able to open a new-task screen for a
  project they own, with title prefilled from the headline, notes from the suggestion,
  and the project identity fixed.
- **FR-009**: Opening the new-task screen MUST NOT create a task.
- **FR-010**: Users MUST still provide task date and start time before a task can be
  created; successful submit MUST create exactly one task through the existing
  task-create capability.
- **FR-011**: Users who do not own the project MUST be forbidden from opening the
  new-task idea flow for that project.
- **FR-012**: Users MUST be able to request another task idea without creating a task.
- **FR-013**: The create screens MUST show a short symbolic context line (season, day
  period, weekday) as creative copy, never as scientific astrology.
- **FR-014**: The create screens MUST show a one-line disclaimer that the seasonal and
  day-night framing is creative, not science.
- **FR-015**: Project name and task title originating from an idea headline MUST
  respect a maximum length of 255 characters.
- **FR-016**: Idea text presented to the user MUST remain in Portuguese as provided by
  the existing idea capability.
- **FR-017**: New user-visible strings introduced by this feature for suggestion
  actions and the disclaimer MAY be Portuguese to match the idea copy; existing
  application chrome that is already in English MAY remain unchanged.
- **FR-018**: Loading an idea MUST be a read-only operation. Creating a project or
  task MUST use the existing create operations only—not a second persist path for the
  suggestion itself.
- **FR-019**: This feature MUST NOT persist the suggestion as its own record, MUST NOT
  auto-create on first view, and MUST NOT set notification flags as part of idea
  prefilling.
- **FR-020**: Edit screens for existing projects and tasks MUST NOT apply a new idea
  over saved data.
- **FR-021**: If the idea cannot be loaded, the create form MUST remain usable with
  empty name/title and notes and a clear, non-blocking explanation.
- **FR-022**: Required field validation for project and task create MUST stay as
  strict as the existing create rules (no weaker validation).
- **FR-023**: The existing read-only idea endpoint and existing project/task create
  endpoints used by other clients MUST remain available and unchanged in purpose.

### Architecture and Integration Impact *(mandatory)*

- **Owning Module**: `planning` owns this capability because project and task create
  screens already live there. Idea transport is a planning concern, not a new module.
- **Affected Layers**: Project create page, task create UI, namespaced Vuex store,
  thin feature service, shared HTTP client, domain types for the idea payload, and
  verification coverage. Dependency flow remains page/component → store → service →
  shared client. Views MUST NOT call the HTTP client directly.
- **API Contract Impact**: Frontend consumes the existing read-only creation-idea
  operation (`GET /api/creation-ideas`) with `target=project` or `target=task` and,
  for tasks, the owning `project_id`. Response mapping uses headline → name/title and
  suggestion → notes (or equivalent `field_hints`). Project create remains
  `POST /api/projects`; task create remains the existing task create operation.
  No new persist endpoint for ideas. Clock override (`at`) is not a user-facing field;
  tests may freeze time without exposing it in the UI.
- **Security Impact**: Screens remain behind the existing authenticated session.
  Task idea loading and task create MUST honor project ownership (forbidden for
  foreign projects). Access tokens stay in memory; this feature does not add cookie
  login, Passport-in-the-browser, or a second auth product.
- **Domain Mapping Impact**: Add a single source of truth for idea fields (headline,
  suggestion, symbolic context) under the planning module types. Do not duplicate
  idea-generation copy or seasonal rules in the frontend.

### Key Entities

- **Creation Idea**: A read-only suggestion for the current user and moment, with a
  headline, longer suggestion text, and a short symbolic context (season, day period,
  weekday). It is not stored as its own business record when shown on the form.
- **Project**: Created only when the user submits the new-project form; name and notes
  may start from an idea but are user-editable.
- **Task**: Created only when the user submits the new-task form for an owned project;
  title and notes may start from an idea; schedule fields remain user-provided.
- **User session**: Existing authenticated application session; guests cannot use
  create screens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of create-project tests for the Sunday-night-spring fixture, the
  expected Portuguese headline and suggestion appear in the name and notes fields
  before any submit, and the project count is unchanged by opening the screen.
- **SC-002**: At least 90% of representative signed-in users can go from opening new
  project to a successfully created project on the first attempt when they supply
  currency and dates, in under 2 minutes.
- **SC-003**: 100% of tests that only open create project or create task record zero
  new projects or tasks.
- **SC-004**: 100% of valid submits after an edited name/title persist the edited
  value, not a newly generated idea.
- **SC-005**: 100% of guest attempts to open create project are sent to sign-in.
- **SC-006**: 100% of non-owner attempts to open the task idea flow for a foreign
  project are denied, with zero tasks created.
- **SC-007**: 100% of invalid project submits (missing currency or dates) create zero
  projects and preserve the user's entered text.
- **SC-008**: 100% of create-form views in acceptance testing show both the symbolic
  context line and the creative-not-science disclaimer.

## Assumptions

- The Laravel backend already exposes a read-only creation-idea capability and
  existing project/task create operations; this Northloom feature is the first-party
  browser UI that shows the idea on create screens.
- Session sign-in, registration, and password recovery are already provided by the
  application; this feature does not add a new login product, Fortify/Breeze, or
  sign-up screens.
- Idea generation rules, templates, and copy live on the backend. The frontend maps
  returned headline/suggestion/context into form fields and does not invent seasonal
  or weekday copy itself.
- “Suggest another idea” always uses the current moment. Users do not pick a clock
  time in the UI.
- Notification settings (`notify` / notify time) are unchanged and are not part of
  idea prefilling.
- Project/task lists, edit/delete, funds/costs, chat, and Telegram UI are out of
  scope except as already required for navigation after a successful project create
  (project detail).
- Lunar phase, generated-model copy, user timezone columns, and translation catalogs
  are out of scope.
- Existing English chrome on surrounding screens may remain; idea body text is
  Portuguese as returned by the idea capability.
- Existing authentication and project ownership rules remain the authority for access.
- After UI work, the create-project flow should be verified in the browser (sign in →
  form shows idea → submit with currency and dates → one project). If browser tools
  are unavailable, HTTP/UI tests are the documented fallback.
