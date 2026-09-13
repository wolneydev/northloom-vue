# Implementation Plan: Creation Idea Form

**Branch**: `002-creation-idea-form` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-creation-idea-form/spec.md`

## Summary

Prefill authenticated project and task create UIs with a read-only Portuguese creation idea (`GET /api/creation-ideas`) mapped into name/title and notes. Users may edit or refresh the suggestion without persisting it. Creating still uses existing `POST /api/projects` and task-create operations. Currency and schedule fields stay empty and required. Guests remain behind the existing login guard. Edit screens never apply an idea.

## Technical Context

**Language/Version**: JavaScript (ES modules) on Vue 3.5 Composition API (`<script setup>`)

**Primary Dependencies**: Vue Router 4, Vuex 4 (namespaced modules), Axios via `src/core/http/httpClient.js`, Vite 6

**Storage**: N/A (idea is not persisted as its own record; session tokens stay in memory)

**Testing**: Vitest 3 + Vue Test Utils + happy-dom (`npm test`)

**Target Platform**: Browser SPA talking to the existing Laravel API

**Project Type**: Web application (Vue frontend only; Laravel already owns idea generation)

**Performance Goals**: Idea fetch is one GET on form open / “suggest another”; create remains a single POST; SC-002 first-attempt create under 2 minutes is a UX outcome, not a new SLA

**Constraints**: Layer order `view → store → service → httpClient`; no `at` clock field in the UI; no second persist path for ideas; headline/title max 255; idea copy stays Portuguese from the API

**Scale/Scope**: Two create surfaces (`ProjectFormPage` create mode, `TaskFormModal` create mode), one idea service/store/types set, contract + component tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Module ownership**: `src/modules/planning/` owns this capability. Idea transport is a planning concern; no new module and no feature rules in `src/core/`.
- **Layering**: Pages/components dispatch Vuex actions; `creationIdeas.service.js` is the only HTTP adapter for `GET /api/creation-ideas`; views MUST NOT import `httpClient` or Axios. Existing create actions on `projects` / `tasks` remain the persist path.
- **Shared infrastructure**: Reuse `env.js`, `httpClient`, `HttpError`, existing `requiresAuth` routes, and namespaced Vuex registration in `src/core/store/index.js`.
- **Security**: No token persistence. Task idea load requires `project_id` and surfaces 403 as forbidden without creating a task. Guests hitting `/projects/new` stay redirected to Login.
- **Contracts and domain types**: Document the idea GET beside the service; map headline/suggestion/context (and optional `field_hints`) in `src/modules/planning/types/creation-idea.types.js`.
- **Verification and documentation**: Contract tests for the idea GET; store tests for mapping/errors/no persist; component tests for project create and task create; update `ARQUITETURA.md` with the idea-prefill flow.

Post-design re-check: passed. No constitution violations; Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-creation-idea-form/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/creation-ideas.md
└── tasks.md
```

### Source Code (repository root)

```text
src/modules/planning/
├── types/creation-idea.types.js
├── services/creationIdeas.service.js
├── store/creationIdeas.store.js
├── components/CreationIdeaHint.vue
├── pages/ProjectFormPage.vue          # create-only idea prefills
└── components/TaskFormModal.vue       # create-only idea prefills

src/core/store/index.js                # register creationIdeas module

tests/contract/creationIdeas.service.spec.js
tests/unit/creation-idea.types.spec.js
tests/unit/creationIdeas.store.spec.js
tests/components/ProjectFormPage.spec.js
tests/components/TaskFormModal.spec.js
tests/unit/architecture-boundaries.spec.js  # extend idea views
```

**Structure Decision**: Keep the existing Vue SPA feature-module layout. Add idea types/service/store under `planning` and a small presentational hint component reused by project and task create UIs.

## Complexity Tracking

> No constitution violations.
