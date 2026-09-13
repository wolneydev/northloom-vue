# Quickstart: Creation Idea Form

## Prerequisites

- Node.js with project dependencies (`npm install`)
- Optional: Laravel API with `GET /api/creation-ideas` and existing project/task create, plus a signed-in user

## Automated validation

```bash
npm test -- tests/contract/creationIdeas.service.spec.js tests/unit/creation-idea.types.spec.js tests/unit/creationIdeas.store.spec.js tests/components/ProjectFormPage.spec.js tests/components/TaskFormModal.spec.js tests/unit/architecture-boundaries.spec.js
```

Expected: all listed suites pass.

## Manual / browser (when API is available)

1. Sign in via existing `/login`.
2. Open `/projects/new` as a guest in a private window → redirected to Login.
3. Open `/projects/new` signed in → name and notes prefilled; currency and dates empty; context line + disclaimer visible; project list count unchanged.
4. Click **Sugerir outra ideia** → name/notes change; still no project created.
5. Fill currency and dates, optionally edit the name, submit → land on project detail; exactly one project with the edited name.
6. Submit without currency/dates → no project; edited text remains (no new idea fetch).
7. As owner, open **New task** on that project → title/notes prefilled; date and start still required; no task until submit.
8. As another user, idea GET for that `project_id` is forbidden; zero tasks created.

## Edit screens

`/projects/:id/edit` and task edit must show saved values, not a freshly generated idea.
