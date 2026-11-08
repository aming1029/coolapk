# UI Structure Refactor Design

## Intent

Improve the maintainability of the frontend UI without changing the current
visual design or user-visible behavior. The first phase focuses on shared
primitives and the message page, which currently concentrates too much state,
DOM manipulation, API access, and presentation in one component.

## Goals

- Keep one canonical location for shared UI primitives.
- Remove unused duplicate UI components.
- Separate message editor utilities from the Vue page.
- Separate message sessions, thread state, and composer state into focused
  composables.
- Extract the session list, thread content, and composer into presentational
  components with typed props and events.
- Preserve existing mobile and desktop interaction behavior.

## Non-Goals

- Visual redesign, spacing changes, color changes, or animation changes.
- API contract changes or backend refactors.
- Replacing Pinia stores or the router architecture.
- Rewriting unrelated pages in this phase.

## Constraints

- Vue 3, TypeScript, Pinia, and Vue Router remain the stack.
- Existing tests must continue to pass.
- The current message page DOM contracts used by tests should remain stable.
- Mobile behavior must continue to work on narrow viewports.
- No dependency additions are required for this refactor.

## Decisions

- `src/components/common` is the canonical shared primitive directory.
- `AppCard` and the existing `AppButton` become the shared primitives.
- Unused `Divider`, `SettingRow`, and `ShortcutKey` components are removed.
- Message-only view-model and editor helpers live under `src/features/messages`.
- The page remains the orchestration boundary for route, stores, lifecycle, and
  cross-composable coordination.

## Success Criteria

- `MessagesPage.vue` becomes materially smaller and delegates message logic to
  focused modules.
- Shared UI primitives no longer have competing implementations.
- Type checking, relevant component tests, and the full test suite pass.
- The app builds and launches with the existing UI intact.

