# Data Model: Creation Idea Form

## CreationIdea (client, read-only)

Transient suggestion for the current user and moment. Not stored as its own business record.

| Field | Type | Rules |
|---|---|---|
| headline | string | Required when load succeeds; max 255; mapped into project `name` or task `title` |
| suggestion | string | Longer Portuguese body; mapped into `notes` |
| season | string | Symbolic; display only |
| dayPeriod | string | Symbolic; display only |
| weekday | string | Symbolic; display only |
| contextLine | string | Derived display copy from season / day period / weekday |
| target | `'project'` \| `'task'` | Request discriminator |
| projectId | number \| null | Required when `target=task` |

**Relationships**: May seed Project or Task form fields. Does not belong to a persisted Idea table on the client.

**State**: `idle` → `loading` → `ready` | `failed`. Failed is non-blocking. Refresh replaces `ready` without POST.

## Project (existing)

Created only on submit of the new-project form.

| Field | Create behavior |
|---|---|
| name | Prefill from headline; user-editable; max 255 |
| notes | Prefill from suggestion; user-editable |
| currency | Empty until user provides; required; 3-letter ISO |
| starts_on | Empty until user provides; required |
| expected_ends_on | Empty until user provides; required |

Opening the form MUST NOT create a row. Failed submit MUST keep current field values.

## Task (existing)

Created only on submit of the new-task form for an owned project.

| Field | Create behavior |
|---|---|
| project_id | Fixed when opened from a project; required |
| title | Prefill from headline; user-editable; max 255 |
| notes | Prefill from suggestion; user-editable |
| task_date | User-provided; required |
| starts_at | User-provided; required |
| notify / notify_at_datetime | Unchanged; not part of idea prefilling |

Non-owners: idea GET and create remain forbidden (403). Opening the form MUST NOT create a task.

## User session (existing)

Guests cannot open protected create screens; existing Login redirect applies.
