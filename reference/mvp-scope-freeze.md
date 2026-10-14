# AI Education MVP Scope Freeze

This document freezes the current MVP scope after the product discussion. It should be used before development planning, page design, or implementation.

## 1. MVP Answer

Yes, the MVP has been discussed enough to enter structured development.

The MVP is not the full education platform. It is a complete learning loop that proves the core method:

```text
一对一
-> 练中学
-> 帮你学
-> behavior data
-> report
-> next personalized action
```

The next work should be structure cleanup and implementation planning, not adding more top-level features.

Core assets the MVP must preserve:

- Student profile and behavior data.
- Question logic library.
- Knowledge atlas.
- Question metadata / tagging system.

The question metadata system is part of the product core, not a later backend detail. Every delivered question should know its curriculum level, knowledge point, atlas node, ability evidence, runtime mode, generation source, solution support, and quality status.

---

## 2. MVP Core Loop

The first version should prove one complete student learning loop:

```text
Registration / entry
-> Basic information
-> Psychological personality test
-> Learning personality test
-> Subject selection
-> Initial subject ability test
-> Multidimensional ability map
-> Student + parent learning goal confirmation
-> Daily time / weekly frequency / total period confirmation
-> Static learning curve
-> Student home
-> Practice
-> Layered hints / guided steps
-> Behavior records
-> Question metadata and evidence capture
-> Question logic adjustment
-> Knowledge atlas entry
-> Stage test
-> Dynamic curve update
-> Report
```

MVP success means this loop can be explained and demonstrated with mock data.

---

## 3. MVP Navigation

Student main navigation is fixed for now:

```text
首页 / 测试 / 练习 / 报告
```

Rules:

- `任务` is not a separate main navigation item. Daily task is the source and state of practice.
- `知识图鉴` is not a main navigation item. It is a secondary entrance from practice results, question explanation, reports, or optional exploration.
- `计划` is not a student main page. The plan is perceived through the learning curve, today focus, and report.
- `画像` is not a student page. It belongs to system, parent, teacher, and backend understanding.

---

## 4. MVP Pages And Roles

### Student Home

Purpose: The student knows where they are and what to do next.

Include:

- Current goal
- Learning curve overview
- Today focus
- Knowledge completion puzzle / map
- Next action
- Light progress signals

Do not include:

- Full profile labels
- Complex plan management
- Backend analysis

### Test

Purpose: One reusable testing module for initial test, stage test, and targeted retest.

Include:

- Basic information flow
- Psychological personality test
- Learning personality test
- Subject selection
- Subject ability test
- Ability map
- Goal confirmation
- Static curve generation
- Stage / calibration test later

Testing rules:

- Initial tests create the static starting point.
- Stage / calibration tests update the dynamic curve.
- Daily practice does not update the dynamic curve directly.

### Practice

Purpose: The main embodiment of `练中学` and `帮你学`.

Include:

- One visible daily action: start doing questions
- Original question retry after wrong answer
- Then change one number
- Then change two numbers
- Then add step / difficulty when stable
- Layered hints
- Guided step-by-step mode
- Previous attempt recall when question is related to a past question
- Multiple validated solution strategies when available

Training rules:

- Students learn by doing first, not by reading a lesson first.
- Wrong answers trigger repeat and feedback.
- All practice behavior becomes input for tomorrow's question logic.
- Practice affects next question logic, not the dynamic curve.

### Report

Purpose: The report explains status and next action.

Include in student report:

- Progress
- Study time
- Correct rate
- Test history
- Peer reference in a gentle way
- Ability trend
- Messages from parent / teacher
- Optional wrong / correct / breakthrough examples
- Knowledge atlas entrance
- Next action

Observer report:

- Parent and teacher share one observer foundation.
- Parent default is support and understanding.
- Teacher default is diagnosis and intervention.
- Observer pages can be configurable by module selection.

---

## 5. MVP Data Objects

The first implementation should keep data close to future architecture:

- Student
- BasicBioInfo
- PsychologicalPersonalityProfile
- LearningPersonalityProfile
- SupportedSubject
- AssessmentModule
- AbilityMap
- LearningGoal
- InitialLearningCurve
- DynamicLearningCurve
- AssessmentCadence
- QuestionLogicUnit
- QuestionInstance
- QuestionSession
- HintLayer
- GuidedStep
- BehaviorEvent
- KnowledgeAtlasEntry
- ReportSnapshot
- Message
- Settings

---

## 6. Learning Curve Rules

Static curve:

- Generated after initial ability test and goal confirmation.
- Inputs include ability map, goal, total period, daily time, weekly frequency, statistics, and optional birthday culture model.
- User-facing curve is upward progress, not downward gap.

Dynamic curve:

- Only updated by tests.
- Can be below, near, or above static curve.
- Daily practice only adjusts next question logic.

Parameter choices after curve update:

- Target level
- Total learning period
- Daily study time
- Weekly frequency
- Review / new-question ratio
- Test interval

Default:

- If student and parent do not actively change parameters, keep original daily study time and weekly frequency.
- In other words, `keep study intensity` is the default.

---

## 7. Question Logic MVP

The MVP should not depend on open-ended AI question generation.

Use bounded question logic:

```text
seed question
-> variable slots
-> legal bounds
-> answer rule
-> validation
-> steps
-> hint layers
-> guided steps
-> variants
```

Rules:

- A generated question can be assigned only if answer, steps, and hints are verifiable.
- Question generation logic and student matching logic are separate layers.
- Math questions should be framed as problem-solving scenarios whenever possible.
- Long-term direction is question logic library + user behavior database + cloud AI generation.

---

## 8. Behavior Data MVP

The MVP should record enough behavior to prove personalization:

- Page entry
- Session time
- Question start
- Answer submission
- Correct / wrong
- Answer time
- Hint layer opened
- Guided mode used
- Retry
- Variant request
- Extra practice
- Harder practice
- Atlas opened or skipped
- Report opened
- Test accepted or skipped

Behavior data feeds:

- Next question logic
- Student internal profile
- Report
- Parent / teacher observer analysis

Behavior data does not directly update the dynamic curve.

---

## 9. MVP In Scope

In scope:

- One student mock flow
- Math MVP: Shanghai-style Grade 1-6 mathematics, delivered through a bounded, grade-aware item logic library rather than one narrow knowledge cluster
- Initial test and stage-test logic
- Static and dynamic learning curves
- Training loop
- Layered hints and guided mode
- Bounded question logic
- Behavior event model
- Knowledge atlas as secondary entrance
- Student report
- Observer report structure in docs
- Mock data, no real backend

---

## 10. MVP Out Of Scope

Out of scope for first implementation:

- Real login / payment
- Full parent account system beyond basic role / link assumptions
- Full teacher classroom system beyond basic role / link assumptions
- Full backend admin beyond documented account / permission foundations
- Real database
- Real cloud AI question generation
- Full multi-subject library
- Large-scale analytics
- Mobile app
- Final UI polish

These are not rejected; they are later phases.

---

## 11. Next Development Step

The next step is to reorganize the existing prototype and docs into an implementation plan:

1. Clean MVP docs so they match the latest decisions.
2. Align prototype navigation with `首页 / 测试 / 练习 / 报告`.
3. Refactor mock data around the MVP data objects.
4. Make the training loop the central implemented interaction.
5. Make report read from behavior data rather than static copy.
6. Keep observer-side work as structure first, not full UI.
