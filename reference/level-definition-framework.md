# Level Definition Framework

This document defines what it means for a student to “reach a level”, such as Grade 6 Math, Grade 7 readiness, or a subject-specific ability target.

The frontend may show a simple label like `G6`, but the backend must treat that label as a verified learning target, not as a piece of display text.

## 1. Public Reference Synthesis

Public education assessment products usually combine several ideas:

- Standards / grade placement: i-Ready reports performance relative to grade-level expectations and includes criterion-referenced grade-level placements.
- Adaptive scale / growth: MAP Growth uses an adaptive assessment and a grade-independent RIT scale to measure growth over time.
- Skill-level next steps: i-Ready emphasizes knowing what students know and what they need next down to the skill level.
- Diagnostic strands: IXL diagnostic shows subject / strand levels and recommends skills to practice.
- Mastery learning: mastery should be criterion-referenced. A student moves forward after showing enough stable evidence on prerequisite knowledge, often around an 80-90% mastery threshold depending on policy.

AI Education should combine these into one internal rule:

```text
Level reached = curriculum scope covered
              + required knowledge nodes mastered
              + enough verified item evidence
              + stable performance across variants
              + stage-test confirmation
```

Daily practice can prepare the evidence, but a level should be officially updated by a test / calibration event, consistent with our dynamic-curve rule.

## 2. Level Is A Backend Object

Logical object:

```text
level_definition
```

Fields:

| Field | Meaning |
| --- | --- |
| level_id | Stable id, such as `math_cn_primary_g6` |
| subject_id | Math, English, science, etc. |
| curriculum_system_id | China national curriculum, US Common Core, TOEFL, school-specific path, etc. |
| level_label | Student-facing label, such as `G6` |
| level_name | Human name, such as `小学六年级数学水平` |
| grade_band | Grade / stage range |
| knowledge_scope | Required knowledge atlas nodes |
| prerequisite_scope | Prerequisite nodes that must not be fragile |
| ability_dimensions | Dimensions measured for this level |
| item_tag_requirements | Required item metadata coverage |
| mastery_policy_id | Threshold policy for reaching this level |
| evidence_policy_id | Minimum evidence amount and recency |
| status | draft, active, retired |

## 3. What Counts As Reaching A Level

For MVP, use this rule:

```text
A student reaches a level when:

1. Core knowledge nodes in this level reach mastery.
2. No critical prerequisite node is below the minimum threshold.
3. Stage test score / ability estimate reaches the level cut score.
4. Performance is stable across original, one-number variant, two-number variant, and more than one controlled reading-form transfer type.
5. Evidence comes from recent test / calibration items, not only free practice.
```

### Suggested MVP Thresholds

These are product defaults, not permanent psychometric constants:

| Evidence area | Default threshold |
| --- | --- |
| Core level nodes | 80%+ mastery probability or equivalent evidence score |
| Critical prerequisite nodes | 75%+ and no repeated failure pattern |
| Stage test confirmation | 80%+ on level-aligned verified items |
| Variant stability | Correct on at least original + 1-number + 2-number variants, without hints |
| Reading-form transfer | At least one correct transfer item across at least two controlled expression types (scene, relationship wording, or question order) |
| Recency | Evidence within the current assessment window |

The threshold can be stricter for high-stakes goals and looser for exploratory recommendations.

## 4. Why Correct Rate Alone Is Not Enough

Correct rate matters, but it cannot define the whole level by itself.

Reasons:

- A student can answer many easy items correctly while still missing the target level.
- A student can memorize a narrow pattern without transfer ability.
- A student may need hints, long time, or repeated attempts; these are useful evidence but not the same as independent mastery.
- A level includes a knowledge scope, not only a numeric score.

So the backend should use:

```text
score evidence
+ item difficulty / level tag
+ knowledge node coverage
+ controlled-number stability
+ reading-form transfer
+ hint independence
+ response time reasonableness
+ stage-test confirmation
```

## 5. Item Tags Required For Level Calculation

Every item used for level evidence must include:

| Tag group | Purpose |
| --- | --- |
| curriculum_level_tag | Which level / grade / standard the item belongs to |
| knowledge_node_tag | Which knowledge atlas nodes it tests |
| prerequisite_tag | Which earlier skills it depends on |
| difficulty_tag | Item difficulty within the level |
| cognitive_demand_tag | Recall, understand, apply, analyze, transfer |
| variant_depth_tag | Original, one-number variant, two-number variant, step-extension |
| support_mode_tag | Assessment, practice, guided, hint-enabled |
| evidence_weight | How much this item counts toward level evidence |
| validation_status | Whether answer, steps, metadata, and support are verified |

No item should count toward level attainment unless its tags and solution validation are complete.

## 6. Relationship To Static And Dynamic Curves

Static curve and dynamic curve must use the same scoring / level-evaluation rule.

The difference is the evidence snapshot:

- Static curve uses the initial ability test and onboarding evidence.
- Dynamic curve uses later stage-test / calibration-test evidence.

In other words:

```text
same scoring rule
+ different evidence snapshot
= static or dynamic curve
```

The static curve uses:

```text
current_level_estimate
target_level_definition
gap_by_knowledge_node
gap_by_ability_dimension
student learning-time parameters
cohort / historical completion data
```

After the static curve is confirmed, it becomes the starting source for first-day daily practice generation:

```text
confirmed_static_curve
+ current_ability_map
+ target_level_definition
+ first_focus_sequence
+ study rhythm parameters
+ question logic library
-> first_day_daily_practice
```

Daily practice updates:

- next-question logic
- variant sequence
- hint timing
- support strategy
- mastery probability as an internal soft signal

But the official dynamic curve only changes after:

- stage test
- calibration test
- parent / teacher requested retest
- system-required test window

When a dynamic curve is recalculated after a test, it should reuse the same `level_definition`, `mastery_policy`, item tags, and curve policy family used by the static curve. The system is not switching to a different scoring rule; it is updating the evidence.

### 6.1 Cross-Family Stage-Test Assembly

A formal stage test must not be a set of four variants from one question family. That can calibrate a narrow skill, but it cannot provide credible evidence for a grade-level target.

For the math MVP, each generated stage-test blueprint uses a bounded 6-8 item sample:

```text
several target-grade core families
+ direct prerequisite check when available
+ original / one-number / two-number evidence for one rotating core family
+ a same-structure new-context transfer item
```

The backend keeps each item's `stageAssessmentRouting` record: target grade, core or prerequisite role, evidence role, rotation index, and assessment scope. Later stage tests rotate the sampled core families, so the system accumulates breadth without showing students a long or exact-count test.

This is still calibration evidence, not an automatic whole-grade promotion. Official attainment remains cumulative and requires the coverage and threshold rules above.

## 7. Student / Parent / Teacher Display Boundary

Student-facing:

- “当前起点”
- “目标水平”
- “还差几块拼图”
- “今天先练什么”

Parent / teacher-facing:

- level definition
- knowledge-node coverage
- cut score / evidence sufficiency
- fragile prerequisites
- stage-test interval
- recommended intervention

Backend:

- full item evidence
- psychometric / rule-engine estimate
- confidence interval
- behavior signals
- model version

## 8. MVP Decision

For the current MVP:

- Use rule-based level definitions first.
- Use item tags and knowledge atlas nodes as the source of truth.
- Use correct rate as one signal, not the only signal.
- Officially update level only through the test module.
- Store all level decisions with versioned policies so the algorithm can improve later without corrupting historical records.
