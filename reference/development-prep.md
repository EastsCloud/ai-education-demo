# AI Education Development Prep

This is the development entry document. Use it before writing production code.

## 1. Current State

The product review phase for the MVP learning loop is complete.

Confirmed loop:

```text
Entry / role
-> Basic information
-> Psychological personality
-> Learning personality
-> Subject selection
-> Initial subject ability test
-> Multidimensional ability map
-> Goal confirmation
-> Learning rhythm parameters
-> Static learning curve
-> Today task
-> Practice runtime
-> Practice completion / extra practice
-> Question detail
-> Knowledge atlas entry
-> Stage test reminder
-> Stage test
-> Dynamic curve update
-> Knowledge atlas overview
-> Role-based report
```

Confirmed student main navigation:

```text
首页 / 测试 / 练习 / 报告
```

Do not add `任务`, `计划`, `画像`, or `知识图鉴` as student main navigation items.

## 2. Source Of Truth

Before development, read these in order:

1. `docs/mvp-scope-freeze.md`
2. `docs/development-reminders.md`
3. `docs/product-decision-checklist.md`
4. `docs/data-model.md`
5. `docs/user-management.md`
6. `docs/shanghai-primary-math-research.md`
7. `docs/dual-ai-development-strategy.md`
8. The page prototype related to the feature being built

If documents disagree, use the newest confirmed decisions in:

- `docs/development-reminders.md`
- `docs/product-decision-checklist.md`
- `docs/today-consistency-cleanup.md`

## 3. Page Prototype Map

| Prototype | Product meaning | Build priority |
| --- | --- | --- |
| `entry-page-01.html` | Entry / role | P0 |
| `entry-page-02.html` | Basic information | P0 |
| `entry-page-03.html` | Psychological personality | P0 |
| `entry-page-04.html` | Learning personality | P0 |
| `entry-page-05.html` | Subject selection | P0 |
| `entry-page-06.html` | Initial subject ability test | P0 |
| `entry-page-07.html` | Profile seed + ability map | P0 |
| `entry-page-08.html` | Goal confirmation | P0 |
| `entry-page-09.html` | Learning rhythm | P0 |
| `entry-page-10.html` | Static learning curve | P0 |
| `entry-page-11.html` | Today task / calendar entry | P0 |
| `entry-page-12.html` | Practice runtime | P0 |
| `entry-page-13.html` | Practice completion + extra practice | P0 |
| `entry-page-14.html` | Question detail / review | P0 |
| `entry-page-15.html` | Knowledge atlas entry from practice | P0 |
| `entry-page-16.html` | Stage test reminder | P1 |
| `entry-page-17.html` | Stage test runtime | P1 |
| `entry-page-18.html` | Dynamic curve update | P1 |
| `entry-page-19.html` | Knowledge atlas overview | P1 |
| `entry-page-20.html` | Student / parent / teacher report | P1 |

## 4. Engineering Layers

### Frontend UI Layer

Owns page layout, student interaction, fuzzy progress, E-style visuals, role-specific report rendering, and light-up atlas rendering.

Must not own mastery truth, question legality, role permission truth, or dynamic curve update truth.

### Application State Layer

Owns current user role, selected student, subject queue, onboarding step, practice session state, route source, and temporary mock persistence.

### Data Model Layer

Owns account / role / binding data, student profile inputs, ability evidence, goals, curve records, question metadata, behavior events, atlas coverage, and reports.

### Algorithm Layer

Owns question generation, legality checks, step / hint verification, daily question allocation, retry / variant progression, static curve generation, dynamic curve recalculation after tests, and report interpretation rules.

### Backend Boundary

For the first implementation, backend can be mocked. But code should be written as if these are future service boundaries:

- account service
- student profile service
- assessment service
- question generation service
- practice session service
- behavior event service
- curve service
- atlas service
- report service

## 4A. Math Research And Question Logic Scope

The first subject is math.

Research scope is broad:

```text
Shanghai-style Grade 1-6 mathematics
```

Use public curriculum / textbook / workbook-style information to study topic structure and item patterns. Do not copy copyrighted questions. Convert public patterns into our own bounded item models.

Development assets:

- `docs/shanghai-primary-math-research.md`
- `src/data/shanghai-math-taxonomy.js`
- `src/modules/math-question-logic.js`

The item logic library should eventually cover Grade 1-6 at the structure level, even when the first implemented demo only exercises part of it.

## 4B. Semi-AI And Full-AI Versions

Build two versions conceptually and architecturally:

| Version | Core idea |
| --- | --- |
| Semi-AI | bounded item models + rule generator + behavior-aware allocation + AI for summary / wording / review |
| Full-AI-Ready | AI candidate generation inside bounded item models + validators + behavior-aware adaptive allocation |

Both versions must use the same student product surface.

The frontend receives validated questions and does not know whether the source was fixed seed, bounded rule generation, or AI candidate generation.

Development asset:

- `docs/dual-ai-development-strategy.md`

## 4C. Investor Materials

After the working prototype reaches a useful demo state, produce:

- A full-system walkthrough video with simulated student and parent roles.
- A Semi-AI investor deck.
- A Full-AI-ready investor deck.

Development asset:

- `docs/investor-video-and-decks-plan.md`

## 5. MVP Build Sequence

### Sprint 0: Foundation

Goal: turn the prototype into a maintainable app structure.

Tasks:

- Create a shared design system from the confirmed E-style.
- Create route definitions for the 20-page flow.
- Normalize mock data into domain objects.
- Create a central event recorder.
- Create shared components for curve, fuzzy progress, question card, hint layers, atlas map, and report metric.
- Keep prototypes as visual references, not the final code structure.

### Sprint 1: Entry And Baseline

Goal: make the student reach a confirmed static curve.

Tasks:

- Entry role
- Basic info
- Psychological personality
- Learning personality
- Subject queue
- Initial ability test
- Ability map
- Goal selection
- Learning rhythm
- Static curve confirmation

Completion standard:

- A student profile seed exists.
- A subject ability map exists.
- A static curve exists.
- Daily task generation can reference that curve.

### Sprint 2: Daily Practice Loop

Goal: prove `练中学` and `帮你学`.

Tasks:

- Today task entry
- Practice runtime
- Answer validation
- Layered hints
- Guided step mode
- Retry
- Variant progression
- Completion summary
- Extra practice
- Behavior event writing

Completion standard:

- The student can complete a practice session.
- Wrong answers lead to retry before moving on.
- Hints reveal cumulatively, not one step replacing another.
- Practice events become tomorrow's question-allocation evidence.

### Sprint 3: Atlas And Report

Goal: make learning evidence visible.

Tasks:

- Question detail
- Knowledge atlas entry
- Light-up atlas overview
- Stage test reminder
- Stage test placeholder using assessment mode
- Dynamic curve update after test
- Student / parent / teacher reports

Completion standard:

- Atlas nodes light up from evidence.
- Reports use behavior and test data, not static text.
- Student report stays gentle; parent / teacher report is deeper and precise.

## 6. Non-Negotiable Product Rules

- One-to-one starts with understanding the student.
- Daily practice does not update the dynamic curve.
- Stage / calibration tests update the dynamic curve.
- Student tests and practice do not show exact question count.
- Practice is the daily task; do not split `任务` and `练习`.
- Knowledge atlas is secondary, but powerful.
- Help-to-learn hints must be layered and cumulative.
- Question generator is backend / algorithm layer.
- Every question needs metadata before delivery.
- Student UI should be visual first and text light.
- Student does not see raw profile or risk labels.
- Parent / teacher can see support analysis and configure allowed parameters.

## 7. First Real Coding Target

The first real coding target should be:

```text
Sprint 0 foundation
-> Sprint 1 entry and baseline
```

Do not start by polishing individual prototype pages. Start by creating the app structure that can support all confirmed pages.

Suggested first implementation order:

1. Route map
2. Domain mock data
3. Design tokens and reusable layout
4. Account / role mock state
5. Onboarding flow state
6. Static curve generation
7. Today task generation from curve

In parallel, build the math foundation:

1. Grade 1-6 taxonomy
2. Item family tags
3. Bounded item model contract
4. Semi-AI / Full-AI question source boundary
5. Delivery validator gate

Current sprint status is tracked in:

```text
docs/sprint-status.md
```

## 8. Development Done Definition

A development step is done only when:

- It follows the decision checklist.
- Data has a clear owner.
- UI is consistent with E-style.
- Student-facing copy is light.
- Backend / algorithm responsibility is not hidden in a page.
- Behavior events are recorded when the action matters.
- The next downstream page can use the produced data.
