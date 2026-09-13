# Research: Creation Idea Form

## Decision: Consume the existing read-only idea endpoint from planning

- **Decision**: Add `creationIdeas.service.js` calling `GET /api/creation-ideas` with `target=project|task` and `project_id` for tasks. Do not send `at` from the UI.
- **Rationale**: Spec forbids a second persist path and clock override. The Laravel backend already generates Portuguese copy.
- **Alternatives considered**: Duplicating seasonal templates in Vue (rejected: frontend must not invent seasonal rules). Adding a dedicated persist-on-view endpoint (rejected: FR-018/FR-019).

## Decision: Namespaced Vuex module `creationIdeas`

- **Decision**: Register `creationIdeas` beside `projects` and `tasks`. Actions: `fetchIdea`, `refreshIdea`, `clearIdea`. State holds the last mapped idea, loading, and a non-blocking load error. Create still goes through `projects/createProject` and `tasks/createTask`.
- **Rationale**: Constitution layering: views dispatch actions; idea state is shared by two create surfaces; failed create must not refetch as a side effect.
- **Alternatives considered**: Fetching from the page via the service (rejected: view → HTTP skip). Folding into `projects.store` only (rejected: tasks need the same idea).

## Decision: Map API fields at the type boundary

- **Decision**: Normalize envelopes `{ data }` and optional `field_hints`. Headline → `headline` (truncated to 255). Suggestion → `suggestion`. Symbolic context (`season`, `day_period`/`period`, `weekday`) → a display line. Never copy idea into edit payloads automatically.
- **Rationale**: Single source of truth under `types/`; services stay thin.
- **Alternatives considered**: Views reading raw API keys (rejected: duplicated mapping).

## Decision: Empty required create fields; keep existing validation

- **Decision**: On new project, leave `currency`, `starts_on`, and `expected_ends_on` empty (stop defaulting currency to `BRL`). After a valid create, navigate to `/projects/:id` (detail). On new task, still require date and start time. Idea load failure leaves name/title and notes empty with a non-blocking message.
- **Rationale**: Matches FR-002, FR-005, FR-010, FR-021, FR-022.
- **Alternatives considered**: Keeping `BRL` prefilled (rejected: spec requires empty currency). Redirecting to the project list (rejected: spec requires detail view).

## Decision: Portuguese chrome only for new idea strings

- **Decision**: “Sugerir outra ideia” and a one-line creative-not-science disclaimer in Portuguese. Existing English page chrome stays.
- **Rationale**: FR-016/FR-017.
- **Alternatives considered**: Full i18n catalogs (out of scope).

## Decision: Verification with Vitest; browser as supplemental

- **Decision**: Contract + store + component tests cover SC-001–SC-008. Browser verification of create-project is documented in `quickstart.md` when a running API is available.
- **Rationale**: Constitution requires automated coverage at the lowest effective level; browser tools may be unavailable.
- **Alternatives considered**: Only manual QA (rejected).
