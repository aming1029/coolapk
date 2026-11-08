# UI Structure Refactor Implementation Plan

> **For agentic workers:** Execute inline in this session. Keep visual and
> behavioral output unchanged. Steps use checkbox syntax for tracking.

**Goal:** Consolidate shared UI primitives and split the message page into
focused utilities, composables, and presentational components.

**Architecture:** The page keeps route/store/lifecycle orchestration. Message
domain helpers and state machines move into `src/features/messages`, while
shared primitives stay in `src/components/common`. Presentational message
components receive typed state and emit user actions.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Vitest, vue-tsc

**Spec:** `docs/superpowers/specs/2026-11-08-ui-structure-refactor-design.md`

## Global Constraints

- Preserve existing desktop and mobile visuals and interactions.
- Do not add runtime dependencies.
- Keep `src/components/common` as the canonical primitive directory.
- Run `git diff --check`, type checking, focused tests, and the full suite.
- Do not push or publish without a separate user request.

## Review Focus

- Message selection and pagination continue to keep the active conversation.
- Rich-text paste, emoji insertion, image preview, and draft behavior remain
  unchanged.
- Scroll restoration and polling still follow the active session only.
- Mobile navigation between session list and active chat remains intact.
- Shared primitive migration preserves variant, disabled, and loading states.

---

### Task 1: Consolidate Shared UI Primitives

**Files:**
- Create: `src/components/common/AppCard.vue`
- Create: `src/components/common/__tests__/AppCard.test.ts`
- Modify: `src/components/feed/FeedCommentSection.vue`
- Modify: `src/components/sidebar/TrendingTopicsCard.vue`
- Modify: `src/components/sidebar/HotRankingCard.vue`
- Delete: unused files under `src/components/ui`

**Interfaces:**
- Produces: `AppCard` props `title?`, `subtitle?`, `hoverable?`, `noPadding?`.
- Consumes: existing `AppButton` props and events.

- [ ] Add an `AppCard` rendering test and run it to verify it fails.
- [ ] Implement `AppCard` and migrate the two sidebar cards.
- [ ] Migrate `FeedCommentSection` from `ui/Button` to `common/AppButton`.
- [ ] Delete unused `ui` components and run focused tests.
- [ ] Commit the primitive consolidation.

### Task 2: Extract Message Domain Helpers

**Files:**
- Create: `src/features/messages/messageModel.ts`
- Create: `src/features/messages/messageEditor.ts`
- Create: `src/features/messages/__tests__/messageModel.test.ts`
- Create: `src/features/messages/__tests__/messageEditor.test.ts`
- Modify: `src/pages/MessagesPage.vue`

**Interfaces:**
- Produces: session normalization, time formatting, history merge/cursor, and
  editor DOM helpers with explicit TypeScript signatures.
- Consumes: existing message API data shapes without changing them.

- [ ] Add tests for history merge, cursor extraction, time formatting, editor
  text round-trip, emoji insertion, and pending-image cleanup.
- [ ] Run the tests and verify they fail because the modules do not exist.
- [ ] Implement the helper modules and replace duplicated page-local helpers.
- [ ] Run focused tests and commit the helper extraction.

### Task 3: Extract Message State And Components

**Files:**
- Create: `src/features/messages/useMessageLayout.ts`
- Create: `src/features/messages/useMessageSessions.ts`
- Create: `src/features/messages/useMessageThread.ts`
- Create: `src/features/messages/useMessageComposer.ts`
- Create: `src/components/messages/MessageSessionList.vue`
- Create: `src/components/messages/MessageThread.vue`
- Create: `src/components/messages/MessageComposer.vue`
- Modify: `src/pages/MessagesPage.vue`
- Modify: `src/pages/__tests__/MessagesPage.test.ts`

**Interfaces:**
- Produces: focused composables whose returned state and actions are consumed
  only by `MessagesPage`; presentational components receive typed props and
  emit explicit user actions.
- Consumes: Task 1 shared primitives and Task 2 message helpers.

- [ ] Add focused tests for the extracted composable boundaries and component
  events.
- [ ] Run the new tests and verify they fail before implementation.
- [ ] Implement layout, session, thread, and composer composables.
- [ ] Extract the three presentational message components.
- [ ] Run message page tests, type checking, and the full test suite.
- [ ] Build the frontend, verify the app launches, and commit the page split.

