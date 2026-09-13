# Contract: Creation Ideas (consume existing API)

Frontend does **not** add or change Laravel routes. This documents the consume-side contract.

## GET `/api/creation-ideas`

Read-only. Must not create projects, tasks, idea rows, or notification flags.

### Query

| Param | Required | Notes |
|---|---|---|
| `target` | yes | `project` or `task` |
| `project_id` | when `target=task` | Owning project |
| `at` | **never from UI** | Tests may freeze time server-side |

### Success 200 (typical envelope)

```json
{
  "data": {
    "headline": "Protótipo de uma ideia ainda não explorada",
    "suggestion": "Sugestão em português sobre crescimento, imaginação e validar uma versão pequena na semana.",
    "context": {
      "season": "primavera",
      "day_period": "noite",
      "weekday": "domingo"
    },
    "field_hints": {
      "name": "Protótipo de uma ideia ainda não explorada",
      "notes": "Sugestão em português sobre crescimento, imaginação e validar uma versão pequena na semana."
    }
  }
}
```

Mapping: prefer `field_hints.name` / `field_hints.title` then `headline` for the title field; prefer `field_hints.notes` then `suggestion` for notes. Truncate title source to 255 characters.

Sunday-night-spring fixture (spec SC-001): local calendar `2026-09-13 21:30` America/Sao_Paulo → headline `Protótipo de uma ideia ainda não explorada` and matching Portuguese suggestion about growth, imagination, and validating a small version in the coming week. The frontend asserts mapped fields when the API returns that payload; it does not generate the copy.

### Errors

| Status | Client behavior |
|---|---|
| 401 | Existing session handling (logout / login) |
| 403 | Task idea for a non-owned project: show forbidden; create zero tasks |
| 4xx/5xx other | Non-blocking: empty name/title and notes; form still submittable |

## Unchanged persist contracts

- `POST /api/projects` — existing `projectsService.create`
- Existing task create — `tasksService.create`

No `POST /api/creation-ideas`.
