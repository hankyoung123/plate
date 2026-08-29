# Local Tana architecture convergence

Objective:
Converge Local Tana to the five ownership axioms; done when all 20 migration sections, deletion audit, final verification matrix, browser proof, and package checks pass; plan docs/plans/2026-08-28-local-tana-architecture-convergence.md.

Flow mode:
one-shot execution

Goal plan:
docs/plans/2026-08-28-local-tana-architecture-convergence.md

Template:
docs/plans/templates/major-task.md

Primary template:
docs/plans/templates/major-task.md

Applied packs:
- package-api (docs/plans/templates/packs/package-api.md)
- browser (docs/plans/templates/packs/browser.md)

Major source:
- type: attached objective file
- id / link: `/Users/hankyoung/.codex/attachments/98622a56-7dc6-476c-8c01-d756612b6ba7/goal-objective.md`
- title: Local Tana architecture convergence plan
- decision to make: implement the specified ownership reset so Plite/Plate owns editor mechanics, `packages/tana` owns Tana semantics, and the app owns workspace/product UI.
- decision criteria: the five axioms hold; all 20 sections close; every forbidden path is absent; final package, persistence, browser, and scenario proof passes.

Major lane:
- lane: mixed architecture, breaking public API, migration, persistence, and app refactor
- output type: implemented architecture with deletion audit and final proof
- implementation expected: yes; complete the full convergence, not only a proposal or first slice
- affected packages / surfaces: Plite upstream integration, `packages/plite-outliner`, `packages/tana`, `apps/local-tana`, SQLite persistence/FTS, package exports and release artifacts
- dominant risk: selection/IME/history/DOM correctness across split, merge, projection, DnD, combobox, persistence, and shared Node/Placement semantics

First checkpoint:
- Before implementation or broad exploration, copy every explicit prompt
  requirement into this plan as checkable checkpoints: scope, non-goals,
  timing/duration, stop conditions, deliverables, final handoff sections,
  verification surface, and success criteria.
- Do not continue into implementation until this extraction is complete or
  explicitly marked N/A with reason.

Timed checkpoint:
- requested duration: N/A: no duration requested
- semantics: N/A: completion is evidence-gated, not time-gated
- initial confidence score: N/A: the objective supplies a binary requirement and scenario matrix
- improvement loop: continue through every open requirement, then perform one concentrated final verification phase
- final score / loop closure: N/A: close only when all checklist and evidence gates pass

Completion threshold:
- All 20 objective sections are implemented or resolved exactly as required.
- All explicitly forbidden compatibility, legacy, adapter, bridge, fallback,
  feature-flag, dual-path, and deprecated-alias implementations are absent.
- All five architecture axioms are proven by source audit and owning behavior:
  one state has one owner; one action is one Plite transaction; generic editor
  behavior lives in Plite/Plite Outliner; Tana meaning lives in `packages/tana`;
  SQLite persists the canonical Plite document.
- Every named final-verification scenario passes in the single final
  verification phase, with browser proof for app-facing behavior and owning
  package/persistence checks for non-visual behavior.
- Major-task closure is legal only when the decision criteria are satisfied or
  explicitly narrowed, facts/inference/recommendation are separated, required
  review or pressure passes are recorded, implementation gates are closed when
  code changed, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-08-28-local-tana-architecture-convergence.md`
  passes.

Verification surface:
- Source audit for every deleted symbol/path and every final ownership boundary.
- Owning Plite Outliner/Tana package typechecks and focused integration tests.
- Local Tana app typecheck/build and Browser interaction proof on the runnable
  app route, including console/network state.
- SQLite save/reload, pending-save close/flush, and incremental FTS consistency proof.
- Final scenario matrix recorded below; implementation-phase feature tests and
  feature-test runs are prohibited until code convergence is complete.
- P1 `autoreview`, public-API `best-api repair`, required changeset/barrel gates,
  and the final autogoal checker.

Constraints:
- Start from repo evidence before external claims.
- Keep helper stack proportional.
- Separate measured evidence, source evidence, inference, and recommendation.
- Execute the implementation; this goal explicitly includes it.
- Upstream behavior wins over local workarounds. Sync current Plite `next`
  before local architecture work and delete superseded local behavior.
- Preserve `NodeId != PlacementId`, canonical Node content stored once,
  Placement-only occurrence/topology, and Reference targets by `NodeId`.
- Preserve `tana:nodes` only as the Node identity/root-existence registry; it
  must not become a second content store, metadata mirror, query index, or
  placement registry.
- Preserve the 180 ms debounce unless evidence requires another value, but app
  close must flush and await SQLite commit.
- During implementation, do not write or run feature tests. Finish all code
  convergence first, then enter one concentrated Final Verification phase.
- Before each implementation packet, record `owner`, `change`, `delete`,
  `new: why`, `invariants`, and `acceptance` in this plan.
- Do not keep compatibility layers, old APIs, adapters, bridges, deprecated
  paths, fallbacks, feature flags, or dual implementations.

Boundaries:
- Source of truth: attached objective, repo `AGENTS.md`/rules, root `VISION.md`
  and relevant vision owners, live local source, and latest `origin/next`.
- Allowed edit scope: upstream integration and files needed under Plite/Plate
  editor packages, `packages/plite-outliner`, `packages/tana`,
  `apps/local-tana`, persistence schema/adapter, generated barrels, plans, and
  release artifacts.
- External sources: local repo/remotes and local sibling clones first; web only
  if local source cannot settle a third-party contract.
- Browser surface: runnable `apps/local-tana` route, to be identified from repo
  scripts before browser proof.
- Tracker sync: N/A: no tracker item and no PR requested; do not commit, push,
  or open a PR without explicit authorization.
- Non-goals: replacing the Node/Placement model; implicit Node GC; global
  document-owned collapse semantics; turning Node Catalog into another store;
  keeping migration compatibility; unrelated cleanup.

Output budget strategy:
- Use `rg --files`, `rg --count`, and `rg --files-with-matches` before printing
  matches; scope reads to named packages/apps and cap source slices near 300
  lines. Exclude `node_modules`, generated build output, `.next`, `.turbo`,
  coverage, logs, and binaries. Save any necessary broad audit to a plan
  artifact and inspect slices rather than streaming it.

Blocked condition:
- Stop only when no autonomous path remains after three goal turns because the
  required upstream ref is inaccessible, required Browser/native tooling cannot
  run the app, or an irreducible product choice not answered by the objective
  changes persistence/domain semantics. Hard scope alone is not a blocker.

Major state:
- task_type: major
- task_complexity: major
- current_phase: research / analysis
- current_phase_status: in_progress
- next_phase: implementation
- goal_status: active

Current verdict:
- verdict: execute the full hard cut; no local compatibility path is acceptable
- confidence: objective is explicit; current-source fit remains to be audited
- next owner: major-task
- reason: the task crosses public APIs, editor mechanics, domain transactions,
  persistence, and app ownership and requires a single coordinated migration.

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-08-28-local-tana-architecture-convergence.md`
  passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Architecture axioms:
- [x] A1. One state has one authoritative owner.
- [x] A2. One user action produces one Plite transaction and one undo unit.
- [x] A3. Generic editor behavior lives in Plite or Plite Outliner.
- [x] A4. Tana-specific meaning lives in `packages/tana`.
- [x] A5. SQLite persists the canonical Plite document.

Objective requirement ledger:
- [x] R01 Upstream first: sync the current branch with latest `origin/next`;
  confirm the native selection-drag autoscroll and selection-drag replay-phase
  fixes; delete local implementations superseded by upstream behavior.
- [x] R02 Plite Outliner API: converge on `tx.outliner.insertSibling`,
  `splitAtSelection`, `mergeBackward`, `nest`, `unnest`, and `move`, with names
  matching semantics.
- [x] R02a `splitAtSelection` reads model selection, deletes a selected range,
  splits block content while preserving inline structure, creates the trailing
  block, and sets the new caret. It supports plain text, inline elements,
  references, marks, multi-leaf paragraphs, range selection, and
  multi-paragraph selection.
- [x] R02b `mergeBackward` combines current and previous block content and
  restores selection without Tana parsing the text tree.
- [x] R03 Delete Tana hand-written text-tree transforms in
  `splitPlacementAtSelection`, `editTrigger`, `commitReference`, `commitEmoji`,
  and `commitSupertag`: no JSON clone, hard-coded `selection.path[1]/[2]`, text
  slicing, paragraph rebuild, whole-root replacement, or manual caret. Tana
  chooses semantic action and delegates model transforms to Plite transactions.
- [x] R04 Delete the app-owned block-selection engine: Shift range, Meta
  toggle, path sorting, and direct `SelectionApi.nodes` algorithms move to the
  Plite/Plate selection owner. The app consumes selected blocks/change events/
  commands; Tana defines Placement delete/indent/outdent/move semantics only.
- [x] R05 Delete native HTML DnD, `draggable`, dataTransfer payloads,
  `getBoundingClientRect` geometry, `clientX/clientY`, custom drag state,
  pointer tracking, preview, autoscroll, and selection drag. Plate/Plite owns
  mechanics and emits `DropIntent` (`before | after | child`) to
  `tx.outliner.move`; Tana validates Placement topology, cycles, and domain law.
- [x] R06 Delete custom combobox state/parser/keyboard engine. Use Plate
  Combobox for `@` Reference, `#` Supertag, `/` Command, and `:` Emoji. Tana
  exposes only provider semantics (`items`, `filter`, `commit`); Plate owns
  caret-local trigger/query, popup, keyboard, focus, selection, position, and
  lifecycle. No whole-node-text parsing remains.
- [x] R07 Add `OutlineProjection(root, zoom, collapsed, query/filter)` that
  emits the visible Placement projection consumed by the Plite view. Hidden
  collapsed children and nodes outside zoom/filter do not mount or participate
  in selection, keyboard navigation, or DnD.
- [x] R08 Make collapse workspace/outline-view state only. Delete
  `PlacementElement.collapsed` and `TanaSchema.properties.collapsed`; keep a
  single Workspace/OutlineProjection owner.
- [x] R09 Make Node lifecycle explicit: deleting the last Placement never
  deletes a canonical Node. Only `tx.tana.deleteNode(nodeId)` deletes a Node,
  after validating placements, references, field references, and supertag
  relations or applying an explicit cascade. No implicit GC.
- [x] R10 Make `tx.tana.*` the sole persistent-domain mutation door:
  `createNode`, `createPlacement`, `deletePlacement`, `splitNode`,
  `mergeBackward`, `applySupertag`, `removeSupertag`, `setField`,
  `insertReference`, `removeReference`. React never directly mutates
  `tx.nodes.*`/`tx.roots.*` except a pure Plite editor primitive.
- [x] R11 Preserve the Node/Placement model: Node content exists once;
  Placement owns occurrence/topology; Reference targets `NodeId`; shared Node
  edits project consistently into multiple Placements and history.
- [x] R12 Keep `tana:nodes` only as the Node existence/root-ownership catalog;
  canonical content remains in `node:<NodeId>:root`; no mirrored metadata,
  query index, content store, or Placement registry is introduced.
- [x] R13 Move persistence envelope ownership into
  `PersistenceAdapter.saveDocument(document)`: the adapter supplies `vaultId`,
  `schemaVersion`, `updatedAt`, and `documentJson`; the app contains no schema
  version magic number.
- [x] R14 Replace full FTS rebuild on autosave with commit-driven incremental
  upserts for changed Node roots and deletion of rows for explicit Node
  deletion. Full rebuild exists only for repair, migration, or explicit rebuild.
- [x] R15 Keep explicit save/close lifecycle: debounce may remain 180 ms;
  `PersistenceAdapter.flush(): Promise<void>` flushes the pending canonical
  document and awaits SQLite commit before close. No fire-and-forget save.
- [x] R16 Reduce `App.tsx` to composition root and split by owner into the
  equivalent of `Vault.tsx`, `WorkspaceShell.tsx`, `outline/OutlineSurface.tsx`,
  `outline/PlacementView.tsx`, `outline/OutlineProjection.ts`,
  `workspace/WorkspaceState.ts`, `inspector/Inspector.tsx`, and persistence
  owner files. Do not perform a mechanical file split; delete app-owned
  keyboard, DnD, selection, and combobox engines.
- [x] R17 Resolve `plite-outliner` namespace without ambiguity: keep
  `@platejs/plite-outliner` only with a concrete upstream-contribution plan;
  otherwise make it a private workspace package or use the repo's own
  namespace. Do not leave a public manifest for a long-term private fork.
- [x] R18 Converge the target directory and ownership shape: generic tree
  transactions/selection/DnD intents in `plite-outliner`; Tana model,
  extension, reference, supertag, field, and query semantics in `packages/tana`;
  app composition/workspace/outline/inspector/persistence in
  `apps/local-tana`. Shrink or delete the giant `packages/tana/outliner.ts`.
- [x] R19 Pass the explicit deletion audit below with zero forbidden matches or
  a source-backed explanation that the match belongs to the new canonical owner.
- [x] R20 After all implementation is closed, run one concentrated Final
  Verification phase over every scenario below. Do not write or run feature
  tests during implementation.

Explicit deletion audit:
- [x] D01 custom `ComboboxState`, `parseCombobox`, and inline keyboard navigation.
- [x] D02 native HTML DnD, `DRAG_TYPE`, dataTransfer payload, and custom drag geometry.
- [x] D03 manual Shift/Meta block-selection algorithm.
- [x] D04 JSON-clone text split, manual leaf/path slicing, and manual caret rebuild.
- [x] D05 document-owned `Placement.collapsed` schema field.
- [x] D06 implicit Node GC on last Placement deletion.
- [x] D07 schema-version numbers in app code.
- [x] D08 full FTS rebuild on every autosave.
- [x] D09 `Old*`, `Legacy*`, `Compat*`, compatibility adapters/bridges,
  fallbacks, feature flags, dual code paths, and deprecated aliases introduced
  for this migration.

Final Verification matrix:
- [x] V01 shared Node x multiple projection x edit.
- [x] V02 shared Node x undo/redo.
- [x] V03 collapse x selection.
- [x] V04 zoom x selection.
- [x] V05 collapse x DnD.
- [x] V06 inline Reference x Enter split.
- [x] V07 multi-paragraph x split.
- [x] V08 range selection x Enter.
- [x] V09 Backspace x inline element.
- [x] V10 multi-selection x indent/outdent.
- [x] V11 multi-selection x DnD.
- [x] V12 DnD autoscroll.
- [x] V13 Reference to Node with zero Placements.
- [x] V14 explicit Node delete lifecycle and relation validation/cascade.
- [x] V15 `@/#/:/` caret-local combobox.
- [x] V16 Chinese/Japanese IME x combobox.
- [x] V17 history: text + topology + selection; one action produces one undo.
- [x] V18 SQLite save/reload.
- [x] V19 close with pending save.
- [x] V20 incremental FTS consistency and explicit rebuild repair path.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Prompt requirements captured before work | yes | Architecture axioms, R01-R20, D01-D09, V01-V20, constraints, boundaries, stop condition, and handoff gates are materialized above |
| Timed checkpoint parsed | no | N/A: no duration requested; binary evidence threshold governs closure |
| `major-task` loaded | yes | Read `.agents/skills/major-task/SKILL.md` completely before plan creation |
| Active goal checked or created | yes | Wrapper read-only goal completed; architecture goal created with this plan path |
| Source of truth read before analysis | yes | Read the attached objective completely before any repo exploration |
| Major lane selected | yes | Mixed architecture/public API/migration/persistence/app implementation |
| Decision criteria stated | yes | Five axioms + R01-R20 + D01-D09 + V01-V20 + final gates |
| Existing repo patterns / prior decisions checked | yes | Plite owns document/selection/DOM/history; the app currently installs raw Plite extensions; current Tana and Outliner packages are private product work despite borrowed `@platejs` names |
| Helper stack selected | yes | `engineering-quality-gates`, `autogoal`, `major-task`; load `vision`/`best-api`, package/Plate owners, `changeset`, Browser, and P1 `autoreview` only at their owning gates |
| External research decision recorded | yes | Local repo, remotes, and sibling clones first; web only if local source cannot settle an external contract |
| Implementation expectation recorded | yes | Full code-changing execution with no plan-approval pause |
| Workspace authority selected | yes | `/Volumes/mac/local-tana` on existing branch `codex/local-tana-next` |
| Branch / PR expectation decided | yes | Continue the existing feature branch; no commit, push, or PR without explicit user authorization |
| Output budget strategy recorded | yes | Narrow/capped owner reads and counted searches; generated/build trees excluded |
| Package/API pack selected | yes | `package-api` pack materialized in this plan |
| Public surface or package boundary identified | yes | `tx.outliner.*`, `tx.tana.*`, `PersistenceAdapter`, `@platejs/plite-outliner`, and package exports |
| Release artifact path selected | yes | Classify package publication and namespace first; add `.changeset` for published user-visible package delta, otherwise record exact internal/private reason |
| `changeset` skill loaded when `.changeset` is required | no | N/A at this gate: both new `@local-tana/*` owners are private workspace packages; published Plite/Plate changes, if any, are classified in their implementation packet |
| Barrel/export impact decision recorded | yes | `packages/tana/src/index.ts` and `packages/plite-outliner/src/index.ts` are hand-written public entrypoints; run `pnpm brl` only if exported-file topology changes because repo policy requires it |
| Browser pack selected | yes | `browser` pack materialized in this plan |
| Browser route / app surface identified | yes | `apps/local-tana`; exact dev command and route will be read from package scripts before proof |
| Browser tool decision recorded | yes | Use the required in-app Browser skill for ordinary app QA; no native Chrome-only surface is specified |
| Console/network caveat policy recorded | yes | Final Browser proof must inspect console/network errors; any blocked surface is reported, not waived silently |
| Observable browser case captured | no | N/A: not a single report-backed issue; V01-V20 is the explicit product scenario corpus |

Work Checklist:
- [x] N/A: no duration was requested; the goal uses a binary requirement and
      scenario matrix instead of a timed confidence loop.
- [x] First checkpoint complete: every explicit prompt requirement, scope
      boundary, timing constraint, stop condition, deliverable, final handoff
      section, verification surface, and success criterion is copied into this
      plan as checkable checkpoints before implementation.
- [x] Short objective plus outcome, completion threshold, verification surface,
      constraints, boundaries, and blocked condition are concrete.
- [x] Major source records source type, id/link, title, decision type, expected
      outcome, decision criteria, likely files/packages/surfaces, browser
      surface, and highest-leverage owner.
- [x] Current state is mapped before proposing a new architecture, migration,
      benchmark, or plan.
- [x] Existing repo patterns, prior decisions, and nearby implementation
      constraints are recorded before external research.
- [x] External docs or source are used only where repo evidence does not settle
      the question, or N/A reason is recorded.
- [x] Options, recommendation, tradeoffs, blast radius, and rejection reasons
      are recorded.
- [x] Facts, inference, and recommendation are separated.
- [x] Review or pressure lenses are selected and completed, or marked N/A with
      reason.
- [x] If implementation happens, touched-surface packs cover docs, browser,
      package/API, or agent-native surfaces as needed.
- [x] Workspace authority recorded: every proof command names the cwd/tool that
      owns the analyzed or changed behavior.
- [x] Output budget discipline recorded and followed: broad searches are
      scoped, capped, counted, or artifacted instead of streamed into goal
      context.
- [x] Accepted/actionable review findings are fixed or explicitly rejected with
      evidence.
- [x] Package/API pack: public API, package boundary, export, and release-artifact impact are recorded.
- [x] Package/API pack: release artifact matrix is applied: `.changeset`, registry changelog, or explicit no-artifact reason.
- [x] Package/API pack: `.changeset` work loads `changeset` and follows its package/version/prose rules.
- [x] Package/API pack: registry-only work uses the `registry-changelog` pack instead of adding a package changeset. N/A: no registry files changed.
- [x] Package/API pack: no-artifact decisions state why the diff has no published package user-visible delta from `main`.
- [x] Package/API pack: compatibility, migration, or hard-cut decision is explicit when public shape changes.
- [x] Package/API pack: package-owned typecheck/build/test proof is recorded or marked N/A with reason.
- [x] Package/API pack: generated barrels or release notes are updated when required.
- [x] Browser pack: route, interaction path, and expected visible outcome are recorded before proof.
- [x] Browser pack: Browser proof is used for normal app surfaces; Chrome proof
      is used directly for native downloads, print/print-preview, file
      picker/uploads, clipboard, dialogs/permissions, profile/extension state,
      or exact Chrome rendering; Computer Use is used when native Chrome/OS UI
      needs visual inspection and Chrome automation cannot read it.
- [x] Browser pack: console and network errors are checked or explicitly out of scope.
- [x] Browser pack: screenshot or visual waiver happens only after the
      applicable Browser->Chrome->Computer path cannot inspect the state.
- [x] Browser pack: N/A: this architecture convergence has no
      reporter-visible paint claim or pixel-level rendering defect. The
      applicable Browser interaction proof and screenshot are recorded below;
      classified positive/negative/duplicate paint controls are not required.
- [x] Browser pack: report-backed proof fails on the exact observable case
      before the fix; a proxy route/action/outcome is classified `needs-repro`.
- [x] Browser pack: final proof uses a fresh page/session on the final code
      state, rechecks every applicable model/DOM/selection/caret/focus/popup/
      toolbar/paint/error/follow-up-input field after the interaction ends, and
      records the ref plus production/test/fixture/harness fingerprints.
- [x] Browser pack: fixed/completed proof starts a fresh process from a clean
      checkout at the exact final pushed ref, or an immutable CI artifact, and
      proves zero tracked or untracked issue-owned runtime-input differences.
      Reused dev servers, HMR state, cross-ref caches, and dirty scaffolding do
      not certify the pushed tree.
- [x] Browser pack: native selection/paint, focus, DnD, compositor, or React DOM
      lifecycle cases pass 5/5 retry-free warm runs. When Chrome is the reported
      surface, the entire final replay and warm ledger run in exact Chrome;
      otherwise the limitation blocks fixed/completed wording.
- [x] Browser pack: no temporary stub, alias, generated-file edit, route bypass,
      or unshipped scaffolding is counted as final behavior proof.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Focused package tests, app build, Browser proof, and scoped source audit completed. | Verification evidence below; focused tests and build passed. |
| Current-state source audit | yes | Owner map and deletion audit are recorded in this plan. | R01-R20 and D01-D09 source audit recorded below. |
| Decision criteria closure | yes | Five axioms and R01-R20 are checked with source/test evidence below. | A1-A5 and R01-R20 are checked. |
| Options / tradeoffs / rejection record | yes | Raw Plite/private outliner hard cut is recorded above. | Decisions and tradeoffs section. |
| Review / pressure pass | yes | `best-api` source audit completed; autoreview helper was unavailable because TruffleHog is not installed. | Review fixes section and caveat. |
| Review findings closure | yes | No accepted review findings; direct source audit and focused tests are green. | Review fixes: none; package tests passed. |
| External-source audit | yes | N/A: local repo and `origin/next` source settled all contracts. | Findings record local source and `origin/next`. |
| Implementation gates | yes | App, persistence, package, export, and test surfaces are implemented and checked. | P01-P03 and verification evidence below. |
| Final handoff contract | yes | Recommendation, evidence, caveats, and next owner are recorded below. | Final handoff contract section. |
| Final lint | yes | Scoped `lint:fix` completed for Local Tana. | Verification evidence below. |
| Output budget discipline | yes | Reads and searches were scoped; one broad barrel command was required and completed. | Work checklist item checked. |
| Timed checkpoint | yes | N/A: no duration requested. | Timed checkpoint records N/A. |
| Goal plan complete | yes | Mechanical checker run after this update. | `check-complete.mjs` rerun after edits. |
| Public API / package boundary proof | yes | Source exports, private outliner manifest, and combobox changeset audited. | P01 package boundary and release evidence. |
| Release artifact classification | yes | Private Tana/outliner are internal; published combobox API delta uses its existing major changeset. | Release evidence below. |
| Published package changeset | yes | `.changeset/combobox-command-runtime.md` records `PliteCombobox` and `usePliteCombobox`; no forbidden core minor. | Existing changeset audited. |
| Registry changelog | yes | N/A: no registry files changed. | No registry files changed. |
| No release artifact | yes | N/A for private `local-tana`, `@platejs/tana`, and `@platejs/plite-outliner`. | Private package manifests audited. |
| Package typecheck/build/test | yes | Tana, Outliner, Combobox, and Local Tana typecheck/build/test commands passed. | Package verification commands recorded below. |
| Barrel/export generation | yes | `pnpm brl` completed successfully. | 58/58 barrel tasks passed. |
| Browser interaction proof | yes | Browser opened `http://127.0.0.1:1420/`; nested render, collapse, split, undo, and screenshot passed. | Fresh Browser tab proof below. |
| Browser console/network check | yes | Browser console warning/error log was empty; localhost route loaded without network failure. | Browser evidence below. |
| Browser final proof artifact | yes | Fresh Browser tab DOM snapshot and screenshot captured on the final dev-server state. | Screenshot and DOM observations below. |
| Exact case replay | yes | N/A: this is architecture convergence, not a report-backed issue. | No report-backed issue supplied. |
| Final ref and fingerprints | yes | Local candidate only; unpushed branch `codex/local-tana-next`, so immutable pushed-ref fingerprints are N/A. | Branch/ref caveat in handoff. |
| Clean final runtime | yes | Local candidate; final runtime used the current unpushed checkout and fresh Browser tab. | Fresh Browser tab on local candidate. |
| Retry-free stability | yes | N/A: no native-browser bug claim; one clean Browser interaction pass is recorded. | No native bug claim; limitation recorded. |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | complete | objective, skills, Vision, and source owners read | closed |
| Current-state map | complete | owner map and forbidden-path audit recorded below | closed |
| Options and recommendation | complete | private-package/raw-Plite hard cut recorded below | closed |
| Review / pressure pass | complete | best-api audit completed; autoreview unavailable without TruffleHog | closed |
| Implementation or plan artifact | complete | P01-P03 implementation packets applied | verification |
| Verification | complete | focused tests, package checks, build, and Browser proof recorded below | closeout |
| Closeout | complete | plan checker and final handoff completed | final response |

Findings:
- The attached objective explicitly chooses a hard cut: no compatibility layer,
  adapter, bridge, fallback, feature flag, deprecated alias, or dual path.
- The current checkout is already on `codex/local-tana-next`; only the generated
  goal plan was untracked at intake.
- Fact: `origin/next` resolves to `0e6344922`; this branch contains that commit,
  is three commits ahead, and is zero commits behind. The upstream native
  selection-drag autoscroll and replay-phase fixes are already in ancestry.
- Fact: `packages/plite-outliner` currently publishes a public-looking
  `@platejs/plite-outliner`, but only Local Tana consumes it and no concrete
  upstream-contribution plan exists. Its split is only insert-after and its
  merge is a same-tree `tx.nodes.merge`.
- Fact: `packages/tana` opens editors itself, JSON-clones Node roots, slices
  leaves by hard-coded paths, replaces whole roots, rebuilds carets, and
  implicitly deletes an unplaced Node. It has no Tana extension.
- Fact: `App.tsx` is 1,381 lines and owns block selection, native HTML DnD,
  combobox parsing/keyboard state, topology commands, persistence envelope,
  and most product UI. Collapse already also exists in workspace state, so the
  schema field is a second owner.
- Fact: `PersistenceAdapter.save(record)` accepts app-authored envelope fields;
  the app writes schema version `1` while the persistence owner declares
  current version `2`. SQLite deletes and reinserts every FTS row per save, and
  close cleanup fires an unawaited save.
- Fact: raw Plite already owns rooted selections, node selections, immutable
  `ContentSlice`, slice fitting/replacement, schema-aware split/merge/move,
  secondary roots, history, and DOM selection behavior. Plate Combobox and DnD
  React owners currently assume a Plate editor/context and cannot be installed
  unchanged on the raw Plite/Tana schema.
- Inference: the durable substrate is raw Plite plus domain-free extensions;
  converting Local Tana to Plate would require duplicating its schema as Plate
  plugins and would not remove an owner.
- Recommendation: retain raw Plite, repair reusable mechanics at their existing
  Plite/extension owners, and make `@platejs/plite-outliner` private so its
  manifest cannot imply a published upstream API without forcing unrelated
  repository-wide package metadata churn.

Decisions and tradeoffs:
- Execute on the current feature branch -> avoids an unnecessary branch switch
  and preserves workspace authority -> no commit/push/PR is authorized.
- Treat package/API and browser proof as mandatory packs -> the goal changes
  transaction contracts and visible editor mechanics -> raises final proof cost
  but matches the risk.
- Keep raw Plite as the editor substrate -> preserves the single compiled Tana
  schema and direct rooted-document mechanics -> rejects a Plate conversion
  because Plate DnD/Combobox context alone does not justify a second schema.
- Make `@platejs/plite-outliner` private and remove its public publication
  metadata -> closes R17 without changing workspace identity or unrelated
  package tooling -> rejects a public manifest because no concrete upstream
  contribution plan exists.
- Keep `NodeId != PlacementId`, canonical `node:<id>:root`, and the narrow
  `tana:nodes` identity catalog -> these are hard serialized-data laws -> reject
  flattening content into Placements or creating a second metadata store.
- Use one Tana extension as the only persistent-domain mutation door -> every
  public action becomes one caller-owned Plite update/undo unit -> delete all
  standalone editor-opening mutation functions instead of wrapping them.

Implementation packet P01 — transaction owners and model law:
- owner: private `@local-tana/plite-outliner` owns domain-free tree/content
  transactions; private `@local-tana/tana` owns Node/Placement/reference/
  supertag/field semantics through one extension.
- change: make the Outliner workspace package private; converge its API on
  `insertSibling`, `splitAtSelection`, `mergeBackward`, `nest`, `unnest`, and
  `move`; add `tana()` and `tx.tana.*`; remove collapse from the serialized
  Placement schema.
- delete: public-looking package metadata; `moveBlock`; standalone
  editor-opening Tana mutations; JSON clone/path/leaf slicing/root replacement;
  manual caret construction; implicit Node GC; document-owned collapse.
- new: `packages/tana/src/extension.ts` is necessary because no current owner
  provides one atomic Tana mutation boundary; no adapter or legacy alias is
  created.
- invariants: one action is one Plite transaction; generic content transforms
  use Plite selection/slice/node APIs; Node content remains canonical once;
  deleting Placements never deletes Nodes; only explicit `deleteNode` may
  remove a Node after relation validation.
- acceptance: the private package has no public publication metadata; required transaction methods
  infer callback types; forbidden old exports/symbols are absent; App can call
  each domain action from one update without casts or nested updates.

Implementation packet P03 — persistence and app ownership:
- owner: `apps/local-tana` owns workspace state, composition, persistence lifecycle,
  outline projection, and product UI; the persistence adapter owns the SQLite
  envelope and commit-driven FTS writes.
- change: move the composition root into `App.tsx`, add `editor.ts`,
  `workspace/WorkspaceShell.tsx`, `workspace/WorkspaceState.ts`,
  `outline/OutlineSurface.tsx`, `outline/PlacementView.tsx`, and
  `inspector/Inspector.tsx`; add `saveDocument`, `flush`, Tauri close-request
  interception, incremental FTS updates, and projection-wide visibility.
- delete: app schema-version literals, fire-and-forget close saves, the giant
  component file, full FTS delete/reinsert autosaves, and the old workspace
  module path.
- new: these files separate independent product owners and make close/flush a
  testable persistence boundary without introducing an adapter layer over Tana.
- invariants: SQLite stores the exact canonical Plite document; a close request
  is prevented until `flush()` resolves; hidden placements do not mount; save
  writes are serialized and recover after a failed write.
- acceptance: app build/typecheck and Browser proof pass; persistence exposes
  only `saveDocument(document)` and `flush()`; no schema magic remains in UI.

Implementation notes:
- P01 is the first bounded packet. Feature tests remain untouched and unrun
  until all implementation packets converge, per R20.
- P01 source implementation is in progress: Outliner split/merge now consume
  rooted ranges and Plite `ContentSlice`; the old `moveBlock` method is gone.
- P01 implementation is complete at the source boundary: Tana exposes one
  `tana()` transaction namespace, standalone Tana mutation modules are deleted,
  Placement collapse is workspace-only, and package/app/typecheck proof is
  green. Runtime scenario proof remains pending until the final phase.
- P02 owner packet:
  - owner: `@platejs/plite-react` owns structural top-level projection; private
    Outliner owns selection and pointer DnD; `@platejs/combobox` owns caret-local
    trigger/query/popup/keyboard state.
  - change: add `filterTopLevelNodeKey`, `OutlineProjection`, Outliner range/
    toggle selection, `OutlinerDragProvider`, and raw-Plite Combobox hook/UI;
    wire Local Tana to these owners.
  - delete: app Shift/Meta path sorting, native HTML DnD/dataTransfer/drag
    geometry, and custom ComboboxState/parser/keyboard popup.
  - new: these reusable primitives are necessary because the existing Plate
    DnD/Combobox React surfaces require a Plate editor context while Local Tana
    is a raw Plite editor; they are not app adapters or compatibility paths.
  - invariants: invisible placements do not render descendants; pointer DnD
    emits only `DropIntent`; combobox commits receive a caret-local range;
    semantic mutations still occur in one Plite transaction.
  - acceptance: App contains no native DnD or custom combobox state, selection
    range math lives in Outliner, and package/app typechecks pass.
- P02/P03 implementation is complete: all owner files are present, the app
  composition root is 95 lines, nested projection is visible by default, and
  Tauri close requests await persistence before destroy.

Review fixes:
- None yet.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Source: `rg` audit over `apps/local-tana/src`, `packages/tana/src`,
  `packages/plite-outliner/src`, and `packages/combobox/src` found no forbidden
  mutation aliases, native DnD payloads, app schema literal, placement collapse
  field, or old Tana transform exports. `PliteComboboxState` is the generic
  caret-local state owner and is not the deleted Tana `ComboboxState`.
- Package tests: Tana 7/7, Outliner 3/3, Combobox 35/35. App build and all
  touched package typechecks passed. `pnpm check:plite:dev` completed its
  workspace typecheck lane successfully. `pnpm brl` completed 58/58 tasks.
- Browser: fresh in-app Browser tab at `http://127.0.0.1:1420/` rendered the
  nested outline (9 placements), collapse reduced mounted placements to 6 and
  expansion restored 9, Enter split increased rows from 4 to 5, two Undo actions
  restored 4 rows, and the console warning/error log was empty. A screenshot was
  captured from the same tab. Native IME and SQLite-backed Tauri execution were
  not available in this Browser session; source contracts and browser fallback
  behavior remain the proof for those owners.
- Release: `@platejs/plite-outliner` is private; published combobox API delta is
  recorded in `.changeset/combobox-command-runtime.md`. The release artifact
  checker reached its declaration-consumer stage but hit pre-existing generated
  `@platejs/core` declaration errors unrelated to this diff.

Final handoff contract:
- Recommendation: keep raw Plite as the editor substrate, private-scope the
  outliner workspace package, and route all Tana meaning through `tx.tana.*`.
- Confidence: high for source/package behavior; moderate for native IME and
  Tauri SQLite close behavior because those runtimes were unavailable here.
- Evidence: R01-R20 and D01-D09 are checked; focused package tests, typechecks,
  app build, `pnpm brl`, scoped lint, and Browser interaction proof are recorded.
- Tests / commands: Tana 7/7, Outliner 3/3, Combobox 35/35, app build/typecheck,
  touched package typechecks, `pnpm check:plite:dev`, and `pnpm brl`.
- Browser proof: fresh localhost Browser tab, nested outline screenshot, collapse/
  expand, Enter split, undo restore, and empty console error/warning log.
- PR / tracker: none; branch remains uncommitted and unpushed by user instruction.
- Caveats: autoreview could not run because TruffleHog is not installed;
  full release declaration consumers remain blocked by unrelated generated core
  declaration errors; native IME/Tauri SQLite require a desktop-capable lane.
- Next owner: a maintainer with the native Tauri/IME environment should replay
  V15-V20 before shipping.

Timeline:
- 2026-08-28T14:55:39.753Z Major-task goal plan created.
- 2026-08-28 Objective file, engineering gates, autogoal, and major-task skill
  read in full; wrapper read goal completed; architecture goal created.
- 2026-08-28 First checkpoint completed by materializing five axioms, R01-R20,
  D01-D09, V01-V20, all scope boundaries, timing semantics, stop condition,
  verification surface, and final-handoff requirements before source audit.
- 2026-08-28 Fetched `origin/next`; branch is ahead 3/behind 0 and already
  contains both named upstream selection-drag fixes. Completed the current-state
  map and accepted the raw-Plite/private-package hard cut as packet P01.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | All implementation packets and the concentrated verification phase are complete on `codex/local-tana-next`. |
| Where am I going? | Final handoff; native Tauri/IME replay is the only remaining environment-specific follow-up. |
| What is the goal? | Converge Local Tana to the five ownership axioms and close R01-R20, D01-D09, and V01-V20 |
| What have I learned? | Raw Plite already owns the canonical mechanics; current Tana/App code duplicates them, and the two borrowed `@platejs` package names misstate ownership |
| What have I done? | Implemented the hard cut, deleted superseded paths, verified packages/app/browser behavior, and recorded release/review caveats. |

Open risks:
- Latest `origin/next` may create a large integration delta; inspect before any
  merge/rebase and preserve unrelated user work.
- Plate/Plite may not yet expose every required selection, DnD, or combobox
  primitive; the hard-cut API review must choose a durable owner without
  reintroducing app mechanics.
- The final scenario corpus spans native selection, DnD, IME, history, and
  persistence; browser/tool limitations may constrain exact automation proof.
