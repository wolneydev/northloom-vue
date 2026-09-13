# Implementation Plan: Optional Currency and Project Hours

**Branch**: `003-optional-currency-hours` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

## Summary

Stop requiring currency on project create/edit. Add optional non-negative `hours` on
the project, mapped in the planning service and shown on the project detail page.

## Technical Context

**Language/Version**: JavaScript, Vue 3 `<script setup>`

**Primary Dependencies**: Vuex 4, Axios via `httpClient`

**Storage**: N/A (Laravel persists)

**Testing**: Vitest + Vue Test Utils

**Target Platform**: Browser SPA

**Project Type**: Vue frontend

**Constraints**: `view → store → service → httpClient`; empty currency/hours become `null` at the service boundary

**Scale/Scope**: Project form, detail, types, projects service, tests

## Constitution Check

- **Module ownership**: `src/modules/planning/`
- **Layering**: Form dispatches `projects/createProject` / `updateProject`; service maps payload
- **Shared infrastructure**: Existing HTTP/auth
- **Security**: Unchanged
- **Contracts**: Document `currency` nullable and `hours` on `projects.service.js`
- **Verification**: Component tests + contract tests for create/update payload

Post-design: PASS

## Project Structure

```text
src/modules/planning/types/planning.types.js
src/modules/planning/services/projects.service.js
src/modules/planning/pages/ProjectFormPage.vue
src/modules/planning/pages/ProjectDetailPage.vue
tests/components/ProjectFormPage.spec.js
tests/contract/projects.service.spec.js
```

## Complexity Tracking

> No constitution violations.
