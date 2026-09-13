# Tasks: Creation Idea Form

**Input**: Design documents from `/specs/002-creation-idea-form/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Verification**: Contract, store, type, and component tests under `tests/`. Browser check in `quickstart.md` when an API is available.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Feature code**: `src/modules/planning/{pages,components,routes,services,store,types}/`
- **Cross-cutting infrastructure**: `src/core/{config,http,router,store}/`
- **Tests**: `tests/{contract,unit,components}/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm planning-module layout and ignore patterns

- [x] T001 Verify `.gitignore` covers `node_modules/`, `dist/`, `*.log`, and `.env*` in `/home/wolneyc/projetos/Vue/northloom/.gitignore`
- [x] T002 Confirm no new npm packages are required in `/home/wolneyc/projetos/Vue/northloom/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Idea domain types, transport, Vuex module, and shared hint UI

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add CreationIdea typedefs, 255-char headline clamp, field_hints mapping, and context-line helper in `src/modules/planning/types/creation-idea.types.js`
- [x] T004 Add thin `GET /creation-ideas` adapter (unwrap envelope, no `at` query from UI) in `src/modules/planning/services/creationIdeas.service.js`
- [x] T005 Add namespaced Vuex module (`fetchIdea`, `refreshIdea`, `clearIdea`, loading/error, no persist) in `src/modules/planning/store/creationIdeas.store.js`
- [x] T006 Register `creationIdeas` in `src/core/store/index.js`
- [x] T007 Add Portuguese disclaimer + context line + “Sugerir outra ideia” presentational component in `src/modules/planning/components/CreationIdeaHint.vue`
- [x] T008 [P] Add type mapping tests in `tests/unit/creation-idea.types.spec.js`
- [x] T009 [P] Add contract tests for idea GET params and unwrap in `tests/contract/creationIdeas.service.spec.js`
- [x] T010 Add store tests (success, 403, non-blocking failure, refresh does not POST) in `tests/unit/creationIdeas.store.spec.js`

**Checkpoint**: Foundation ready — create UIs can consume the idea module

---

## Phase 3: User Story 1 - Create a project from a prefilled idea (Priority: P1) 🎯 MVP

**Goal**: Authenticated users opening `/projects/new` see a Portuguese idea in name/notes, can refresh or edit without persisting, then create one project via existing create.

**Independent Test**: Sign in, open new project, confirm prefills and zero new projects; fill currency/dates; submit; exactly one project with submitted name; guests go to login.

### Verification for User Story 1 ⚠️

- [x] T011 [P] [US1] Add failing component tests for create-project idea prefill, empty required fields, suggest-another, failed-submit preservation, edit-mode skip, and redirect to detail in `tests/components/ProjectFormPage.spec.js`
- [x] T012 [P] [US1] Assert `ProjectCreate` stays `requiresAuth` in `tests/unit/planning.routes.auth.spec.js`

### Implementation for User Story 1

- [x] T013 [US1] Load/refresh idea only in create mode, leave currency/dates empty, maxlength 255, keep values on failed save, navigate to project detail after create in `src/modules/planning/pages/ProjectFormPage.vue`
- [x] T014 [US1] Extend architecture boundary coverage for project create + idea hint in `tests/unit/architecture-boundaries.spec.js`

**Checkpoint**: User Story 1 independently testable

---

## Phase 4: User Story 2 - Create a task from a prefilled idea (Priority: P2)

**Goal**: Owners opening new-task see title/notes prefilled; date/start still required; non-owners forbidden; refresh does not create a task.

**Independent Test**: Owner opens new task → prefilled, zero tasks; submit schedule → one task. Non-owner idea flow forbidden, zero tasks.

### Verification for User Story 2 ⚠️

- [x] T015 [P] [US2] Add failing component tests for task create idea prefill, locked project, suggest-another, 403 forbidden, edit-mode skip, and no create on open in `tests/components/TaskFormModal.spec.js`

### Implementation for User Story 2

- [x] T016 [US2] Fetch idea on create when `project_id` is known; do not fetch on edit; surface 403; keep date/start required in `src/modules/planning/components/TaskFormModal.vue`
- [x] T017 [US2] Ensure project-detail New task still uses locked project id in `src/modules/planning/pages/ProjectDetailPage.vue`

**Checkpoint**: User Stories 1 and 2 independently testable

---

## Phase 5: User Story 3 - Understand the suggestion as creative context (Priority: P3)

**Goal**: Create forms show a short symbolic context line and a one-line creative-not-science disclaimer.

**Independent Test**: Open new project or new task and see both lines without extra navigation.

### Verification for User Story 3 ⚠️

- [x] T018 [P] [US3] Assert context line and disclaimer in `tests/components/ProjectFormPage.spec.js` and `tests/components/TaskFormModal.spec.js`

### Implementation for User Story 3

- [x] T019 [US3] Render `CreationIdeaHint` on create project and create task in `src/modules/planning/pages/ProjectFormPage.vue` and `src/modules/planning/components/TaskFormModal.vue`

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs and full verification

- [x] T020 Update idea-prefill flow in `ARQUITETURA.md`
- [x] T021 Run `npm test` and the suites listed in `specs/002-creation-idea-form/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1**: After Foundational
- **User Story 2**: After Foundational; reuses idea store/hint
- **User Story 3**: After US1/US2 surfaces exist
- **Polish**: After desired stories

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2
- **User Story 2 (P2)**: After Phase 2; hint component from Phase 2
- **User Story 3 (P3)**: Copy/hint on the US1/US2 forms

### Parallel Opportunities

- T008 and T009 after T003–T004
- T011 and T012 before T013
- T015 before T016

---

## Parallel Example: User Story 1

```bash
Task: "Add failing component tests in tests/components/ProjectFormPage.spec.js"
Task: "Assert ProjectCreate requiresAuth in tests/unit/planning.routes.auth.spec.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + 2
2. Phase 3 (project create idea)
3. Validate `ProjectFormPage` tests

### Incremental Delivery

1. Foundation
2. US1 project create
3. US2 task create
4. US3 copy visibility (may land with US1/US2 if hint is already mounted)
5. Docs + `npm test`

---

## Notes

- Do not persist ideas, auto-create on view, or set notify flags from prefilling
- Do not expose `at` in the UI
- Do not weaken existing create validation
