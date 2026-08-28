# Local Tana Implementation

Objective:

Implement a complete local-first Tana-style outliner on the official Plate
`next` v54 architecture. Plite owns editor mechanics, Tana owns domain
semantics, and Local Tana owns workspace, persistence, and product UI.

Completion threshold:

- Every Work Checklist item is checked with source or final proof.
- Plite exposes generic outliner transactions.
- Tana owns the canonical Node/Placement model and rebuildable indexes.
- Local Tana provides the workspace, search, SQLite persistence, Tauri shell,
  and usable outliner workflow.
- Final proof covers package, persistence, interaction, history, IME, and reload.

Verification surface:

- Source audit of package ownership, exports, schema, transaction boundaries,
  identity, persistence, and rebuildable indexes.
- Package typecheck, lint, focused tests, builds, strict Plite contracts, and
  Chromium proof.
- SQLite migration, transaction, JSON, FTS, and integrity proof.
- Native Tauri AX interaction and reload proof.
- Branch, changeset, agent-rule, and generated-artifact audit.

Constraints:

- Baseline: upstream Plate `next` v54 at
  `083e54b326644fe4590097c4d7eeb04e4af4928e`.
- Invariant: `Plite -> Tana -> Local Tana App`; one action is one coherent
  transaction and one history unit.
- Derived indexes never author mutations and rebuild from the canonical
  document.
- Product implementation preceded the dedicated final verification phase.
- Preserve user changes. No commit, push, or PR is authorized.

Boundaries:

- Source scope is `packages/plite-outliner`, `packages/tana`,
  `apps/local-tana`, agent contract rules, and the changeset.
- Plite outliner exports generic operations and drop intents only.
- Tana owns Node/Placement, references, supertags, fields, queries, and
  domain transactions; it does not own React workspace state or SQLite.
- Local Tana owns navigation, tabs, panels, search, persistence, and Tauri.
- Non-goals: hosted collaboration, cloud services, AI chat, publishing, and
  mobile clients.

Blocked condition:

Stop only if a required toolchain fails after three distinct in-scope
attempts, an irreversible user-authority action is required, or required
behaviors conflict without an owner-preserving interpretation.

Start Gates:

| gate | applies | evidence |
|---|---|---|
| Source objective | yes | Objective file was read before continuation; latest user correction excludes external product material from scope. |
| v54 baseline | yes | `git merge-base HEAD origin/next` matches `083e54b326644fe4590097c4d7eeb04e4af4928e`; branch is `codex/local-tana-next`. |
| Current-state audit | yes | Existing v54 Plite document, transaction, history, selection, DOM, React, and shared-root APIs were reused. |
| Ownership decision | yes | Generic mechanics are in `packages/plite-outliner`; domain semantics are in `packages/tana`; product workflow is in `apps/local-tana`. |
| Product-first contract | yes | Implementation completed before final verification and feature tests. |
| Agent contract | yes | Rules 13-16 are in `.agents/AGENTS.md` and the root mirror. |
| Release path | yes | `.changeset/brave-trees-outline.md` exists for published outliner behavior. |

Work Checklist:

- [x] Official Plate `next` v54 baseline and `codex/local-tana-next` branch are verified above.
- [x] Architecture chain `Plite -> Tana -> Local Tana App` is preserved.
- [x] Plite owns document, transaction, history, selection, caret/focus/IME, shared roots, React, and DOM editing.
- [x] Tana owns Node/Placement, outliner, reference, supertag, field, and query semantics.
- [x] Local Tana owns workspace, navigation, search, SQLite, Tauri, and product UI.
- [x] One vault uses one Plite runtime and one SQLite-persisted canonical document.
- [x] `NodeId` and `PlacementId` are distinct branded identities.
- [x] Nodes have one canonical shared root; placements are hierarchical occurrences that may share a Node.
- [x] Indexes are rebuildable and never author mutations.
- [x] Plite provides `insertSibling`, `splitAtSelection`, `mergeBackward`, `nest`, `unnest`, and `moveBlock`.
- [x] Plite owns block selection, caret boundaries, drop geometry, post-transaction selection, multi-root navigation, and shared-root projection.
- [x] Tana routes Enter, Backspace, Tab, Shift+Tab, collapse, zoom, selection, and drag/drop to Plite primitives.
- [x] Plite selection supports editing -> node selection -> idle, single/range/multi-select, delete, copy, cut, indent, outdent, and drag.
- [x] Drag/drop supports before, after, child, same-parent, cross-parent, subtree, multi-node, and cycle prevention.
- [x] References target NodeId and support @ trigger, search, insertion, rendering/edit/removal, backlinks, and hover preview.
- [x] Supertags support definitions, metadata, fields, defaults, view configuration, # trigger, apply/remove, inheritance, and search.
- [x] Fields support text, number, boolean, date, select, and node-reference definitions and values.
- [x] One combobox owner handles @, #, /, and : parsing, filtering, rendering, and atomic commit semantics.
- [x] Split, merge, indent/outdent, drag, reference, supertag, and field actions are one transaction and one undo unit.
- [x] Query/index exposes placements by node, children, backlinks, nodes by supertag, field values, ancestors, and descendants.
- [x] SQLite stores vault_id, schema_version, document_json, updated_at; node FTS is derived.
- [x] Workspace state owns tabs, sidebar, panels, navigation, outline, zoom, collapse, dialogs, and search while Plite owns editor state.
- [x] The first UI includes continuous outliner, bullets, collapse/expand, zoom, breadcrumbs, references, and context menu.
- [x] AI Coding Contract rules 13-16 are recorded in source instructions and mirrored.
- [x] No feature tests ran before planned product functionality was implemented.
- [x] Final Plite proof covers shared roots, projections, split, merge, nest, unnest, selection, DnD, history, and IME; outliner proof covers before/after/child intents, cross-parent movement, multi-selection, and cycle prevention.
- [x] Final Tana proof covers Node/Placement, cycle prevention, Reference, Supertag, Field, and Query.
- [x] Final app proof covers shared editing, Chinese/Japanese IME, Enter/Backspace/Tab, selection, DnD intents, Reference, Supertag, Field, Undo/Redo, persistence, and reload.
- [x] Failures were fixed at authoritative owners; the final schema failure was fixed with a declared canonical Node catalog root and vault-load upgrade.

Completion Gates:

| gate | applies | evidence |
|---|---|---|
| Named threshold | yes | All checklist rows are checked and evidence is recorded below. |
| Source audit | yes | Changed package, app, persistence, schema, and agent surfaces were reviewed against v54 `next`. |
| Tradeoff decision | yes | Generic outliner APIs remain in Plite; domain model and catalog remain in Tana; workspace and SQLite remain in app state. |
| Review pass | yes | Agent-native capability review passed and direct source review completed. |
| Findings closure | yes | Tana test failure was repaired in model/outliner ownership; rerun is 9/9. |
| External sources | yes | No external source was needed; checked-out v54 source and local official toolchains were sufficient. |
| Implementation | yes | Product, package exports, agent rules, changeset, persistence, and Tauri surface are present. |
| Final lint | yes | `pnpm --filter local-tana lint` passed with all files formatted. |
| Goal plan | yes | The autogoal checker passed after this final record was written. |
| Browser proof | yes | Plite Chromium proof passed; app Browser rerun hit URL policy, so native Tauri proof covers the built app surface. |
| Package proof | yes | Tana, Plite Outliner, and app checks passed; exact results are below. |
| Release artifact | yes | Changeset exists for published `@platejs/plite-outliner` behavior; no registry-only change exists. |
| Agent sync | yes | Source and root mirror contain rules 13-16; generated skill mirrors were not edited directly. |
| Agent-native review | yes | Direct capability-map/source audit passed; optional autoreview stopped before engine invocation because TruffleHog is unavailable. |

Phase / pass table:

| phase | status | evidence | next |
|---|---|---|---|
| Intake and source read | completed | Objective and repository instructions were read. | final record |
| Current-state map | completed | v54 Plite substrate and affected surfaces were audited. | final record |
| Architecture decision | completed | Ownership-preserving package split was selected. | final record |
| Implementation | completed | Plite Outliner, Tana, Local Tana, persistence, rules, and changeset exist. | verification |
| Verification | completed | Package, SQLite, strict Plite, Chromium, and native evidence are recorded. | closeout |
| Closeout | completed | Branch, caveats, and handoff are recorded. | none |

Findings:

- Node and Placement lifecycles are distinct. A declared catalog root keeps a
  canonical Node root schema-owned after the last Placement is removed.
- `ensureNodeCatalog` upgrades legacy documents during vault load.
- Native proof is the final app surface because Browser localhost navigation was
  blocked by URL policy after the initial connection failure.

Decisions and tradeoffs:

- `@platejs/plite-outliner` contains no Tana concepts.
- Ordinary Placement deletion preserves the canonical Node root and catalog.
  Merge cleanup removes a Node only when no Placement remains.
- SQLite is authoritative under Tauri. localStorage is only the browser
  fallback. FTS is rebuilt from canonical nodes on save.

Implementation notes:

- Branch: `codex/local-tana-next`.
- Baseline: `origin/next` v54,
  `083e54b326644fe4590097c4d7eeb04e4af4928e`.
- Preserved user commit: `1fbbd224` with message `123`.
- Tracked generated Tauri output under `apps/local-tana/src-tauri/target`
  was preserved and not historically rewritten.

Review fixes:

- Added atomic Emoji `:` commit and corrected trigger routing.
- Added editing/node-selection/idle transitions, range/meta selection, delete,
  collapsed Enter expansion, reference Enter navigation, keyboard dialogs,
  and context-menu collapse.
- Fixed single-node `after` move destination adjustment in the generic Plite
  outliner owner.
- Corrected Placement-only deletion and added the canonical Node catalog
  schema owner for orphan-safe lifecycle behavior.

Error attempts:

| error / failed attempt | count | resolution |
|---|---:|---|
| Closed-schema error after Placement-only deletion | 1 | Added catalog root and updated Node create/merge transactions; Tana is 9/9. |
| Native colon input was interpreted unexpectedly | 1 | Used paste plus End to open the Emoji chooser; Enter inserted 😀. |
| Browser localhost rerun was blocked by URL policy | 1 | Used the rebuilt native Tauri app for app-level proof. |
| Autoreview could not start without TruffleHog | 1 | Kept direct review and recorded the limitation. |
| Workspace manifest check reported missing devDependencies in untouched media/table packages | 1 | Preserved unrelated baseline packages and recorded the scoped waiver. |
| Outliner test exposed an incorrect single-node after destination | 1 | Corrected destination adjustment in `moveBlock` and reran all three outliner tests. |

Verification evidence:

- Branch/base: `git status --short --branch` showed `codex/local-tana-next`;
  `git merge-base HEAD origin/next` matched
  `083e54b326644fe4590097c4d7eeb04e4af4928e`.
- `pnpm --filter @platejs/plite-outliner typecheck`, test, and build passed:
  3 tests passed, 0 failed.
- `pnpm --filter @platejs/tana typecheck`, test, and build passed:
  9 tests passed, 0 failed.
- `pnpm --filter local-tana lint`, typecheck, and build passed; Vite
  transformed 440 modules.
- `cargo fmt --manifest-path apps/local-tana/src-tauri/Cargo.toml -- --check`
  and `cargo check --manifest-path apps/local-tana/src-tauri/Cargo.toml`
  passed.
- `pnpm --filter local-tana tauri build --debug` passed and produced
  `/Volumes/mac/local-tana/apps/local-tana/src-tauri/target/debug/bundle/macos/Local Tana.app`
  and
  `/Volumes/mac/local-tana/apps/local-tana/src-tauri/target/debug/bundle/dmg/Local Tana_0.1.0_aarch64.dmg`.
- Strict Plite proof passed: 171 contract tests, 74 Bun contracts, package
  builds/public types, and 710 Chromium checks with 8 skips across 79 batches.
  A repeat in the current shell re-passed the typecheck, package-tests, and
  contracts steps, then stopped before Chromium because the shell had Node
  v24.12.0 while the repository requires Node 22; the earlier Node 22
  Chromium result remains the valid browser proof.
- SQLite proof passed migration, transaction, canonical JSON, derived FTS
  query, and `PRAGMA integrity_check` returned `ok`.
- Earlier app Browser proof passed tags/fields, reference/backlink, slash
  command, Chinese input/search, persistence reload, and zero fresh
  warning/error logs before the URL-policy block.
- Native AX proof on the rebuilt app observed SQLite saved status, continuous
  outliner, shared badges, Inspector, `:smile` chooser -> 😀,
  `@Pro` chooser -> rendered reference, and persistence after quit/relaunch.
- `git diff --check` passed.
- `pnpm test:manifests` was run; it reports only the untouched baseline
  declarations in `packages/media/package.json` and `packages/table/package.json`.

Final handoff contract:

- Recommendation: accept the local feature branch for human review.
- Confidence: high for source, package, persistence, and native behavior;
  moderate for the final app Browser rerun because URL policy blocked localhost.
- Evidence: package, strict Plite, SQLite, Tauri, native AX, and source evidence
  are listed above.
- PR/tracker: none; no commit, push, or PR was created by this task.
- Caveats: about 6,142 tracked generated files exist under
  `apps/local-tana/src-tauri/target`; optional autoreview lacks TruffleHog.
- Next owner: human review of `codex/local-tana-next` and generated-artifact
  policy.

Reboot status:

| question | answer |
|---|---|
| Where am I? | Closeout; implementation and final verification are complete. |
| Where am I going? | Human review of `codex/local-tana-next`; no repository mutation is authorized. |
| What is the goal? | Complete Local Tana architecture on Plate `next` v54. |
| What have I learned? | Canonical Node roots need explicit schema ownership after Placement removal. |
| What have I done? | Implemented package, domain, app, persistence, Tauri, agent contract, changeset, and final proof. |

Open risks:

- Browser URL policy blocked one final localhost Browser rerun; native Tauri
  proof covers the same built app artifact.
- The current shell lacks Node 22, so a strict-browser rerun is unavailable;
  the recorded Node 22 Chromium run passed before this continuation.
- Tracked `src-tauri/target` creates substantial repository noise and needs
  human review before any future commit.
- Workspace manifest check still reports the two unrelated baseline package
  declarations named above; no Local Tana package is implicated.
- Optional autoreview remains unavailable until TruffleHog is installed; direct
  review is the recorded substitute.
