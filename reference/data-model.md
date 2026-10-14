# AI Education Data Model

This document maps user-facing MVP pages to backend data ownership. It should be used when turning prototype pages into real frontend forms, APIs, and database tables.

## Behavior-Event Boundary

Every behavior event belongs to a student and, once a subject is active, a subject. Server learning paths, reports, atlas evidence, and graph evidence query the current subject only. Older one-subject prototype events remain readable during migration, but cannot cross a recorded subject boundary.

Client-originated activity is intentionally bounded: the API accepts only a server allowlist of non-score event types and a small sanitized payload contract for timing, voluntary help, review, and navigation. A `solution_strategy_opened` event may retain only a canonical strategy identifier known to the validated Math strategy library when its delivery id, candidate id, student, subject, practice mode, support permission, and available strategy all match a server-held question delivery; arbitrary or unlinked strategy names are discarded. The browser cannot submit answer correctness, answer values, level claims, or arbitrary evidence fields. Answer events are created only by the server-owned delivery and scoring route.

An answer event may carry a private source-delivery link for an exact wrong replay or a correct-answer context review. The server uses that link to interpret reproduction evidence and independent retry success, but strips it from browser responses and browser hydration. A retry is successful only after a correct answer with no opened hint or guided step on that delivery. Server-scored answer evidence also records bounded help counts, so reports, knowledge maps, and behavior matching use the same definition of independent completion.

## 1. Principle

Each page review must define:

- Frontend inputs
- Standard option source
- Backend write target
- Derived records
- Downstream consumers

The frontend should not keep important learning data as page-only state. Every confirmed value should belong to a clear data object.

---

## 1A. Account And User Management

User management is a foundation layer. It supports the student learning loop, but it should not become a student-facing main page.

Logical tables:

```text
users
user_role_assignments
student_guardian_links
student_teacher_links
account_profile_settings
account_invites
account_audit_events
auth_sessions
password_reset_tokens
```

Current executable local implementation uses `user_accounts`, `student_profiles`, `student_access_links`, `auth_sessions`, and `account_audit_events`. A single active access-link record expresses the current student self / guardian / teacher relationship. An adult may revoke only their own link; the record becomes inactive, the action is audited, and a later role-bound invite can reactivate that adult's link. The more normalized logical tables below remain the forward-compatible production model.

The local implementation also uses `student_relationship_invites`: a hashed, single-use, role-bound relationship code with a seven-day expiration. It is an intentional bridge toward production invite delivery without exposing a student identifier to an accepting observer.

### users

| Field | Meaning |
| --- | --- |
| user_id | Stable account id |
| display_name | User-facing name |
| username | Optional handle; not the only login identity |
| email_or_phone | Login identifier, depending on region / product policy |
| password_hash | Stored password hash; never plaintext |
| email_verified_at | Verification timestamp, if email is used |
| phone_verified_at | Verification timestamp, if phone is used |
| locale | Display language |
| timezone | User timezone |
| account_status | invited / active / suspended / archived |
| created_at | Account creation time |
| updated_at | Last update |

### user_role_assignments

| Field | Meaning |
| --- | --- |
| user_id | Account |
| role | student / parent / teacher / admin |
| scope_type | global / student / group / class / school |
| scope_id | Optional scope id |
| assigned_by_user_id | Who assigned the role |
| status | active / revoked |

### student_guardian_links

| Field | Meaning |
| --- | --- |
| student_user_id | Student account |
| guardian_user_id | Parent / guardian account |
| relationship_type | parent / guardian / other |
| permission_level | observe / configure / approve |
| status | invited / active / removed |

### student_teacher_links

| Field | Meaning |
| --- | --- |
| student_user_id | Student account |
| teacher_user_id | Teacher account |
| group_id | Optional class or group |
| permission_level | observe / configure / assign |
| status | invited / active / removed |

### account_profile_settings

Owns lightweight account preferences:

| Field | Meaning |
| --- | --- |
| user_id | Account |
| avatar_asset_id | Uploaded or selected avatar |
| nickname | Optional nickname |
| visual_style_option_id | Student page style preference |
| font_size_option_id | Reading preference |
| information_density_option_id | UI density preference |

### account_invites

Tracks invitation flows:

| Field | Meaning |
| --- | --- |
| invite_id | Stable invite id |
| invited_role | student / parent / teacher |
| invited_by_user_id | Who sent invitation |
| target_contact | Email / phone |
| link_target_type | student / group / class |
| link_target_id | Optional target |
| invite_status | sent / accepted / expired / revoked |

### account_audit_events

Important account and permission changes must be traceable:

| Field | Meaning |
| --- | --- |
| event_id | Stable event id |
| actor_user_id | Who made the change |
| actor_role | Role used for the action |
| target_user_id | Affected account |
| action_type | invite / role_change / link_change / profile_prefill / permission_change / archive |
| old_value | Structured previous value |
| new_value | Structured new value |
| created_at | Event time |

### auth_sessions

| Field | Meaning |
| --- | --- |
| session_id | Stable session id |
| user_id | Account |
| created_at | Session creation time |
| expires_at | Expiration time |
| revoked_at | Revocation time, if any |
| last_seen_at | Last activity time |

### password_reset_tokens

| Field | Meaning |
| --- | --- |
| token_id | Stable token id |
| user_id | Account |
| delivery_channel | email / phone |
| token_hash | Hash of reset token |
| expires_at | Expiration time |
| used_at | Use time |

Rules:

- Student account settings stay light: avatar, nickname, style, accessibility, and logout.
- Full user management belongs to observer / admin workspaces, not the student main navigation.
- Parent / teacher can prefill allowed student fields, but student confirmation is recorded where appropriate.
- Permission checks must gate reports, learning-rhythm changes, test-interval changes, messages, and student links.
- Raw behavior labels and backend profile signals are never exposed through account settings.

---

## 2. Page 02: Basic Information

Page 02 collects standardized basic information. These values may be prefilled by a parent or teacher observer flow, then automatically carried into the student flow for confirmation or adjustment.

This page does not collect:

- Daily study time
- Weekly frequency
- Total study period

Those are collected after initial testing and goal confirmation, because they are static learning curve parameters rather than basic profile fields.

### 2.1 Standard Option Catalog

All Page 02 values should come from a standard option catalog, not free-text input.

Logical table:

```text
standard_option_catalog
```

Fields:

| Field | Meaning |
| --- | --- |
| option_id | Stable option id, such as `cn_primary_6` |
| option_group | Field group, such as `gradeLevel` |
| value | Machine value |
| label | User-facing copy |
| locale | Display language |
| metadata | Optional structured constraints, such as minutesMin / minutesMax |
| active | Whether this option is currently available |

Prototype source:

```text
src/data/onboarding-schema.js -> basicInfoOptionCatalog
```

### 2.2 Student Basic Info

Logical table:

```text
student_basic_info
```

Owns stable background fields:

| Frontend field | Backend field | Source |
| --- | --- | --- |
| Birthday year / month / day | birth_date | Parent / teacher prefill, student confirmation |
| Current grade | grade_level_option_id | Standard option catalog |
| Current stage | school_calendar_stage_option_id | Standard option catalog |
| Curriculum system | curriculum_system_option_id | Standard option catalog |

Required metadata:

| Field | Meaning |
| --- | --- |
| student_id | Student owner |
| source_role | `parent`, `teacher`, `student`, or `system` |
| source_user_id | Who last provided the value |
| confirmation_status | `prefilled`, `student_confirmed`, `needs_review` |
| confirmed_by_student_at | Timestamp if confirmed by student |
| updated_at | Last update |

### 2.3 Student Learning Context

Logical table:

```text
student_learning_context
```

Owns learning-environment fields:

| Frontend field | Backend field | Source |
| --- | --- | --- |
| Routine preference | routine_preference_option_id | Standard option catalog |
| Attention span band | attention_span_band_option_id | Standard option catalog |
| Reading comfort | reading_comfort_option_id | Standard option catalog |
| Primary device | primary_device_option_id | Standard option catalog |

These are not ability judgments. They provide initial constraints for test length, UI density, problem text rendering, and reminders. They must be adjusted later using real assessment and behavior data.

### 2.4 Confirmation Events

Logical table:

```text
student_profile_confirmation_events
```

Purpose:

Track whether the student confirmed, changed, or skipped prefilled values.

Fields:

| Field | Meaning |
| --- | --- |
| event_id | Unique event id |
| student_id | Student owner |
| page_id | `entry-page-02-basic-information` |
| action | `confirmed`, `changed`, `skipped`, `needs_parent_review` |
| changed_fields | Array of changed field ids |
| actor_role | `student`, `parent`, `teacher` |
| occurred_at | Timestamp |

This matters because changing or accepting prefilled values is itself useful behavior data: it tells the system whether observer-provided data matches the student's self-understanding.

### 2.5 Derived Baseline

Logical table:

```text
student_derived_baseline
```

Derived from:

```text
student_basic_info
+ student_learning_context
+ standard_option_catalog
```

Outputs:

| Derived field | Used by |
| --- | --- |
| age | Statistical baseline, test wording |
| age_cohort | Peer / norm reference |
| grade_band | Subject ability boundaries |
| curriculum_cohort | Goal catalog and statistical baseline |
| default_assessment_chunk_minutes | Initial test pacing |
| default_ui_density | Student UI adaptation |
| default_problem_text_density | Problem rendering and hint style |

This table stores system calculations. It should be recalculated when confirmed basic information changes. Later assessment and behavior data can override or refine these derived defaults.

---

## 3. Page 02 Data Flow

```text
Parent / teacher prefill
-> student_basic_info
-> student_learning_context
-> Student confirms or adjusts
-> student_profile_confirmation_events
-> student_derived_baseline
-> Psychological test generation
-> Learning personality test generation
-> Subject selection defaults
-> Initial ability test routing
-> Statistical baseline
-> Static learning curve inputs
```

Prototype source:

```text
src/data/onboarding-schema.js -> onboardingDataFlow
```

### 3.1 Local Runtime Record

The local development runtime currently persists the Page 02 handoff as one scoped JSON record before the production tables are split out:

```text
student_onboarding_prefills
```

It contains only standardized option ids and the student-scoped subject preselection, plus `source_role`, `source_user_id`, `last_updated_by_role`, `confirmation_status`, and timestamps. Parent and teacher can create or revise a prefill; the linked student can confirm it or revise the same standardized values. The API validates every option id and keeps access scoped to the linked student.

---

## 4. Frontend Ownership

Page 02 frontend should:

- Render options from `basicInfoOptionCatalog`.
- Store selected option ids, not display labels.
- Show when values are prefilled.
- Let the student confirm or adjust.
- Write confirmation events.
- Never treat Page 02 fields as ability results.

Page 02 frontend should not:

- Ask for free-text values for standard fields.
- Ask for daily learning time, weekly frequency, or total period.
- Expose backend risk labels.
- Lock the student into a profile based on this page alone.

---

## 4B. Page 05: Subject Selection Data Flow

Page 05 is the boundary between personality-profile seeding and subject ability testing.

Frontend purpose:

- Show supported subjects in a simple visual list.
- Let the student / parent select one or more learning subjects.
- Make clear that subject ability testing starts after this choice and proceeds one subject at a time.

Logical tables:

```text
supported_subject_catalog
student_subject_selection_queue
subject_assessment_module_map
subject_ability_dimension_catalog
```

### supported_subject_catalog

Stores the subjects the system can show:

| Field | Meaning |
| --- | --- |
| subject_id | Stable subject id, e.g. `math`, `english`, `science` |
| display_name | Student-facing subject name |
| availability_status | `enabled`, `preview`, `locked`, `coming_later` |
| first_supported_cluster_id | First MVP knowledge cluster |
| description | Short student-facing explanation |

### student_subject_selection_queue

Stores the selected subject queue:

| Field | Meaning |
| --- | --- |
| queue_id | Unique queue record |
| student_id | Student owner |
| subject_id | Selected subject |
| queue_order | The order in which this subject should be tested |
| selected_by_role | `student`, `parent`, `teacher`, `system_prefill` |
| confirmation_status | `prefilled`, `confirmed`, `changed` |
| test_status | `not_started`, `in_progress`, `completed`, `skipped` |
| selected_at | Timestamp |

### subject_assessment_module_map

Routes the selected subject into the right test module:

| Field | Meaning |
| --- | --- |
| subject_id | Subject |
| assessment_module_id | Initial / stage test module |
| default_cluster_id | First knowledge cluster |
| item_generation_logic_id | Which question logic library to use |
| ability_map_template_id | Which multidimensional ability map to create |

For the math MVP, the initial-assessment route is resolved only after subject selection and confirmed basic information are available. The route snapshot should retain `target_grade`, the selected item-family ids, each family's role (`target` or direct `prerequisite`), and any same-structure context probe. A server-only per-run `assessment_seed` is retained with the private session to reproduce a validated run while varying legal contexts and equally suitable family choices; it must never appear in the public session payload. Advanced-grade stretch items are excluded from the default initial route; later adaptive diagnostics may explicitly opt into them.

### subject_ability_dimension_catalog

Defines the dimensions for the ability map after the initial subject test:

Math MVP dimensions:

- Concept understanding
- Reading and information extraction
- Equation building
- Step reasoning
- Calculation stability
- Variant transfer
- Hint dependency during subject tasks

Boundary:

- Page 05 does not assess ability.
- Page 05 chooses one or more subjects and routes the student to the first subject ability test in the queue.
- If multiple subjects are selected, the system completes initial ability testing one subject at a time.
- Parent / teacher can prefill the subject; the student flow should show it as prefilled and allow confirmation when appropriate.

---

## 5. Assessment And Practice Progress Display

Student-facing assessments and practice should not display exact question numbers or total counts, such as:

```text
Question 1 / 12
第 1 题 / 共 12 题
```

Reason:

- Exact counts can create completion pressure.
- Students may rush to finish instead of focusing on the current question.
- For tests, exact counts can increase test-like pressure.

Backend still owns exact sequencing:

```text
assessment_session.current_item_index
assessment_session.total_item_count
practice_session.current_item_index
practice_session.planned_item_count
```

Student frontend should render only fuzzy progress:

```text
just_started
settling_in
steady_progress
almost_done
complete
```

or a visual path without numeric count. Parent / teacher / backend views may see exact progress when needed.

---

## 5B. Question Item Metadata

Every delivered question must carry metadata. This applies to fixed-bank questions, logic-library variants, and future AI-generated questions.

Logical tables:

```text
question_item
question_item_metadata
question_standard_alignment
question_knowledge_alignment
question_evidence_model
question_quality_review
```

### question_item_metadata

| Field | Meaning |
| --- | --- |
| question_id | Stable question id |
| logic_unit_id | Source item model / question logic unit |
| subject_id | Subject |
| runtime_modes | `assessment`, `practice`, `stage_test`, `review` |
| education_system_tags | US / China / IB / other curriculum mappings |
| grade_band_tags | Approximate grade / level placement |
| instructional_grade | The resolved grade used for this delivered candidate; must be inside `grade_band_tags` |
| difficulty_level | Internal level, separate from grade |
| cognitive_demand | Recall, procedure, reasoning, transfer, modeling |
| estimated_time_sec | Expected response time range |
| variant_level | L0 original, L1 one number, L2 two numbers, etc. |
| support_allowed | Whether hints / guided steps are available in this mode |

Each current Math item also has a private `logicModel` specification: its version, core relation, variable slots, allowed family variants, static seed / answer limits, and allowed step-extension range. The model is validated against the known family definition and is not sent to the browser.

The runtime stores the same resolved value in the item snapshot's `systemLevelTags`, `difficultyTags`, and `generationTags`. This allows a cross-grade item family to remain one logic unit while preserving the actual number range and cognitive load used for a specific student.

### question_feature_signature

Each validated Math candidate also carries a private, bounded feature signature used only for behavior matching:

| Field | Meaning |
| --- | --- |
| signature_version | Current matching-signature contract version |
| structural_keys | Family/domain, unit handling, relationship modeling, representation, and step-load keys |
| operation_keys | Addition, subtraction, multiplication, or division structure where applicable |
| numeric_keys | Bounded patterns such as decimal, zero, magnitude band, or digit presence; never a raw input value |
| matching_keys | Deduplicated union used in behavior evidence and seed selection |

The server copies only these keys into a trusted scored-answer event. It never stores a special-number hypothesis as a student label. A feature can guide a future within-level seed only after repeated evidence shows a sufficiently higher error rate than the learner's current baseline. The exact prior original question always has priority over feature matching.

### question_standard_alignment

Stores standards and curriculum mapping:

| Field | Meaning |
| --- | --- |
| question_id | Question |
| standard_system | `CCSS`, `NGSS`, `CN_National`, `IB`, etc. |
| standard_code | Standard id or internal mapped id |
| alignment_strength | Primary / secondary / prerequisite |
| human_verified | Whether a human has confirmed the alignment |

### question_knowledge_alignment

Connects the question to the knowledge atlas:

| Field | Meaning |
| --- | --- |
| question_id | Question |
| knowledge_cluster_id | Knowledge cluster |
| knowledge_point_id | Specific knowledge point |
| atlas_entry_id | Knowledge atlas node |
| misconception_ids | Common misconception / wrong-answer patterns |
| prerequisite_ids | Prerequisite knowledge |

### question_evidence_model

Defines what the question can prove:

| Field | Meaning |
| --- | --- |
| question_id | Question |
| ability_dimension_ids | Ability map dimensions |
| evidence_targets | Claims the item can support |
| observable_behaviors | Correctness, time, revision, uncertainty, hint depth |
| scoring_rule_id | Scoring / signal extraction rule |

### question_solution_derivation

Private derivation certificate for a validated mathematical item. It is not sent in a student delivery.

| Field | Meaning |
| --- | --- |
| question_id | Question |
| derivation_version | Versioned certificate contract |
| family_id | Bounded item-family source |
| context_template_id | Prompt context that anchors the reading step |
| application_context | Versioned real-world scenario cue, question goal, and prompt binding that prevent bare-calculation delivery |
| variable_slots | Named family variables used by the model |
| answer_rule | Canonical restricted math rule |
| computed_answer | Independently evaluated rule result |
| answer_input | Safe learner input contract such as numeric or `HH:MM` clock time; the canonical stored value stays server-side |
| step_bindings | Ordered links from each visible step to context, relationship rule, computation, or answer check |
| support_phases | Shared four-phase hint route: `read_translate -> relationship -> calculation -> check`; guided S1/S2 extensions may add `organize` and `plan` before calculation |
| hint_bindings | Ordered private source links for each released hint layer |
| guided_bindings | Ordered private source links for each guided-response phase |

The delivery gate verifies the complete certificate and strips answer-bearing fields from the browser payload. Hints always follow the four-phase source chain: context template, answer rule, restricted calculation, then answer check. Guided S1/S2 extensions insert one or two `structured_step` bindings for organizing information and planning the calculation before the standard calculation phase. The application-context certificate, template identifiers, prompt fingerprints, and validation traces are also server-only. Every current candidate also passes a family-specific semantic validator: it verifies the permitted canonical rule shape, required formula constants, and grounding of rule values in the visible context, with a direct clock-to-rule check for elapsed-time items. Clock questions expose only the safe `HH:MM` input contract; the server normalizes and scores it as a bounded minute value. The same contract is rendered and scored in practice, initial assessment, and no-help stage assessment. Future Full-AI candidates must pass this same semantic gate and canonical source binding before they can be delivered.

### question_quality_review

Controls whether generated questions can be delivered:

| Field | Meaning |
| --- | --- |
| question_id | Question |
| generated_by | Rule engine, AI, human author, hybrid |
| review_status | `draft`, `system_validated`, `human_verified`, `retired` |
| validation_rule_ids | Legality / solvability / decomposition validators |
| answer_verified | Whether answer is verified |
| answer_rule_evaluated | Whether the restricted evaluator independently recomputed the answer rule |
| bounded_model_verified | Whether the candidate matches its versioned family logic-model boundary |
| family_semantics_verified | Whether the rule shape and visible-number grounding match the tagged math family |
| application_context_verified | Whether the item retains a prompt-bound real-world scenario and explicit question goal |
| solution_derivation_verified | Whether each solution step has a validated evidence binding |
| support_evidence_bindings_verified | Whether hint layers and guided steps map to the validated standard chain, including any permitted `structured_step` extensions |
| steps_verified | Whether steps are verified |
| hint_layers_verified | Whether hint layers are verified |

Delivery rule:

```text
No complete metadata -> no student delivery.
No verified answer / steps / mode-appropriate support -> no student delivery.
No verified hint / guided source bindings -> no student delivery.
No verified real-world application context -> no student delivery.
No configured Full-AI provider / canonical source binding / family semantic validation -> no Full-AI student delivery.
```

Assessment mode can hide hints from the student, but the backend still needs validated solution and evidence tags.

### question_deliveries

`question_deliveries` is the runtime boundary between a valid internal item and the student-facing question surface. It keeps the authoritative candidate, answer rule, validation trace, hint layers, and attempt history on the server.

| Field | Meaning |
| --- | --- |
| delivery_id | Server-generated immutable delivery id |
| student_id / subject_id | Access and reporting scope |
| mode | `practice` or `formal_assessment` |
| generation_request | Family, grade, seed, variant, source queue, generator track, and any private replay / correct-review source delivery link used to recreate the item |
| private_candidate | Validated candidate, answer, rule, support structures, and validator trace; never returned before scoring |
| support_state | Whether support is allowed plus revealed hint / guided-step depth and safe response states |
| guided_responses | Private short-reasoning records and final numeric attempts for revealed guided steps; protected behavior events retain only the safe guided-step phase and status, while public delivery exposes only step, status, and attempt count |
| started_at | Server timestamp recorded when the delivered question is first shown |
| attempts | Server-scored answer attempts with server-started elapsed time, timing source, and hint depth |
| status | delivered / in_progress / completed |
| created_at / updated_at | Audit timestamps |

Delivery rules:

- The browser receives a presentation object, never `answer`, `answerRule`, raw hint layers, or validator trace before they are intentionally revealed.
- Dynamic learning text, including future AI-generated prompts, hints, guided steps, atlas labels, and earlier student answers, is always rendered as plain text at the browser boundary; it is never trusted as executable markup.
- Practice can reveal one hint or guided step at a time. A guided step must receive a server-recorded response before the next one is released; formal assessment returns no support route at all.
- A completed guided process has a separate student-only export route. Its raw step records are not part of normal question delivery or any parent / teacher report.
- The server, rather than the page, compares the submitted response with the authoritative answer and returns only a result state such as correct / retry required.
- A server-scored attempt emits one trusted `answer_submitted` behavior event. Direct browser submission of an answer-result event is rejected, so future matching does not rely on a client-claimed score.
- Parent and teacher accounts may read appropriately scoped learning records but cannot submit an answer for a student.

### assessment_sessions (server-owned runs)

The same persisted session table supports onboarding and formal assessment runs. A server-owned run separates private question evidence from the presentation sent to the browser. During an in-progress test, the browser receives only its own response state, elapsed time, and safe metadata; answer keys, generation traces, and item-level correctness remain private until the server derives a completed summary.

| Field | Meaning |
| --- | --- |
| session_id / student_id / subject_id | Immutable run identity and access scope |
| assessment_type | `initial_onboarding` or `stage_test` |
| question_snapshot | Private question ids, answers, quality state, and scoring metadata; never returned to the browser |
| presentation_questions | Prompt plus safe curriculum / ability tags only |
| responses | Private submitted answers, timing, and server-scored correctness |
| public_result | Safe counts, accuracy, coverage, and ability signals after completion |
| server_authoritative | Prevents generic browser persistence from overwriting a protected run |

Rules:

- Initial ability testing has no hint route and does not update the dynamic curve.
- Stage testing has no hint route and can update the dynamic curve only after a complete, validated run.
- A student or administrator can submit an answer; a parent or teacher can read a permitted result but cannot answer on behalf of a student.

### daily_practice_plans

`daily_practice_plans` makes daily matching stable across the homepage, calendar, curve, and practice entrances. It is distinct from a mutable practice-progress session.

| Field | Meaning |
| --- | --- |
| plan_id / student_id / subject_id / practice_date | One server-owned matching decision for one student, subject, and day |
| task | The static- or dynamic-curve-derived daily task context |
| allocation | Private behavior-aware bucket allocation, smoothing result, and bounded next-practice priority; guided final-check states can only add a small review / self-check focus |
| question_queue | Grade-bounded family, seed, controlled variant, and private replay / correct-review source bindings |
| family_mastery | Private evidence-weighted, per-family matching estimate from trusted scored answers |
| behavior_analysis | Private confidence-bounded matching evidence, never a student label |
| public presentation | Task summary plus safe queue identity / family / grade only; no seed, allocation ratio, behavior analysis, answer, or support structure |

Rules:

- The server resolves a daily plan only after a static curve has been confirmed.
- Repeated resolution for the same day returns the stored queue rather than re-running the matching algorithm.
- The queue may change tomorrow's questions but cannot change the dynamic curve.

### daily_practice_runs

`daily_practice_runs` owns required-practice progression after the daily matching plan has selected the queue. It is separate from the browser-resume session: the session may remember a calm student-facing surface, while this record decides which required step is actually available.

| Field | Meaning |
| --- | --- |
| run_id / student_id / subject_id / practice_date | One server-owned required-practice run for the same scope as its daily plan |
| daily_plan_id | Immutable source plan whose selected queue is being completed |
| queue_items | Private family, grade, seed, and any source-delivery binding used to generate each required item |
| current_unit_index / current_stage_index | Current server step in the required progression |
| active_delivery_id | The only answer-scored delivery that can release the current step |
| completed_stages | Server-scored completion trace; never a browser-supplied completion claim |
| status / required_practice_completed | `in_progress` or `required_completed` state used by optional-practice gating |
| public presentation | Current safe family / grade / variant step and calm status only; no seed, answer, or private queue details |

Rules:

- Standard and wrong-retry units follow `original -> change_one_number -> change_two_numbers`. A correct-review unit that is bound to a prior no-hint original answer starts with `context_change -> change_one_number -> change_two_numbers`, preserving the same mathematical relation while checking it in a fresh real-world setting.
- Exact wrong-retry and correct-review source identifiers remain private. Students see only the next question and never a backend label such as “checking whether you really knew it.”
- An incorrect practice attempt keeps the current step active. Only a correct answer scored against the active server delivery releases the next stage.
- A direct or stale delivery cannot advance a run, even if it has a later-stage variant label.
- Parent and teacher accounts may read a linked student's safe run status but cannot create deliveries or submit answers.
- Browser refresh restores from this run before using a locally saved practice-session position. Optional extra practice starts only after the server marks required practice complete.

---

## 6. Page 03: Psychological Personality Support Assessment

Page 03 is not a medical or diagnostic personality test. It is a learning-support assessment.

Product name:

```text
Psychological Personality Support v1
心理性格测试 v1：学习支持测评
```

Professional anchors:

- Big Five / OCEAN
- OECD social and emotional skills
- CASEL social and emotional learning

The product model is simplified into five dimensions:

| Product dimension | Backend id | Main system actions |
| --- | --- | --- |
| 探索与好奇 | exploration_curiosity | Variant challenge access, atlas extension, exploration prompts |
| 自我管理 | self_management | Task chunking, reminder frequency, daily start design |
| 挫折恢复 | frustration_recovery | Wrong-answer feedback intensity, recovery tasks, difficulty ramp |
| 互动与求助 | interaction_help_seeking | AI response timing, parent / teacher message timing, independent thinking window |
| 接受反馈方式 | feedback_receptivity | Feedback tone, hint-layer default, guided-step availability |

### 6.1 Logical Tables

```text
assessment_logic_library
assessment_session
assessment_item
assessment_response
assessment_dimension_signal
student_support_profile_initial
```

### 6.2 Assessment Logic Library

Owns the reusable generation logic:

| Field | Meaning |
| --- | --- |
| logic_library_id | `psychological-personality-logic` |
| version | `psychological-personality-support-v1` |
| professional_anchors | Big Five, OECD, CASEL |
| product_dimensions | Five product dimensions |
| scene_types | School / life scenarios |
| option_types | Standard response options |
| scoring_rules | How each option affects dimensions |
| guardrails | No diagnosis, no fixed labels, no medical claims |

Prototype source:

```text
src/data/mock-data.js -> psychologicalPersonalityLibrary
```

### 6.2B Learning Personality Logic Library

Page 04 is still part of personality testing. It does not measure subject knowledge. It only creates an initial learning personality seed for practice support.

| Field | Meaning |
| --- | --- |
| logic_library_id | `learning-personality-logic-v1` |
| version | `learning-personality-v1` |
| product_dimensions | Hint dependency, challenge tolerance, expression preference, error response, self-review tendency |
| scene_types | Wrong answer, hard question, hint choice, review after practice, variant exploration, daily task completion |
| option_types | Try again, light hint, guided steps, full solution, easier variant, harder variant |
| scoring_rules | How each option affects learning personality dimensions |
| onboarding_items | Six light scenario choices for Page 04 |
| guardrails | Not subject ability testing; low-confidence signals are refined through later behavior |

Prototype source:

```text
src/data/mock-data.js -> personalityLogicLibrary
```

### 6.3 Item Count And Stop Rule

Backend owns exact counts. Student UI only sees fuzzy progress. Page 03 and Page 04 share one combined onboarding budget, because a long initial questionnaire can make students resistant before learning starts.

```text
combined_psychological_and_learning_personality_max_items = 12
planned_psychological_items = about 6
planned_learning_personality_items = about 6
low_confidence_policy = defer to later behavior data and lightweight micro-checks
```

Stop when:

- The combined Page 03 + Page 04 item budget reaches 12.
- Core dimensions have at least an initial signal when possible.
- Conflicting or low-confidence dimensions are flagged for later refinement.
- Fatigue signal is high enough that continuing would reduce quality.

### 6.4 Response Storage

Logical table:

```text
assessment_response
```

Fields:

| Field | Meaning |
| --- | --- |
| response_id | Unique response id |
| session_id | Assessment session |
| student_id | Student owner |
| item_id | Generated item |
| selected_option_id | Standard option id |
| response_time_ms | Time used |
| self_reported_uncertainty | Student selected uncertain / skip, or marked an answer as uncertain |
| response_type | Numeric answer, uncertain marked answer, or uncertain skip |
| server_correctness | Private server-only score; not returned as an in-progress item result |
| changed_before_submit | Whether student changed answer |
| fuzzy_progress_phase | Student-facing progress phase |
| occurred_at | Timestamp |

### 6.5 Dimension Signals

Logical table:

```text
assessment_dimension_signal
```

Stores backend interpretation:

| Field | Meaning |
| --- | --- |
| signal_id | Unique signal id |
| response_id | Source response |
| dimension_id | One of five product dimensions |
| score_delta | Direction and size of signal |
| confidence_delta | Confidence contribution |
| evidence_type | Scenario / option / behavior |
| student_visible | Usually false for raw signals |

### 6.6 Output Profile

Logical table:

```text
student_support_profile_initial
```

Student-facing output:

- Gentle learning support summary
- Suggested support style
- Recommended first feedback mode
- Optional lightweight learning type card

Parent / teacher / backend output:

- Five-dimension profile
- Confidence level
- Evidence summary
- Suggested observation points
- System action defaults

Boundary:

Raw dimension scores and risk-like interpretations are not shown as student-facing labels.

### 6.7 Continuous Profile Refinement

The 12-item onboarding assessment is only the initial seed. It should not be treated as a complete profile.

Logical table:

```text
student_profile_signal_events
```

Purpose:

Continuously refine the student profile from real system behavior.

Behavior sources:

| Behavior source | Profile use |
| --- | --- |
| Answer time pattern | Pace, focus, possible guessing or overthinking |
| Hint depth | Preferred support level and hint dependency |
| Hint-free retry success | Recovery and independent transfer |
| Wrong-question retry choice | Review willingness and frustration recovery |
| Same-type extra practice choice | Self-directed reinforcement |
| Harder variant choice | Challenge preference and exploration |
| Variant transfer success | Learning flexibility and transfer |
| Knowledge atlas open / skip | Reflection and concept-check preference |
| Correct/wrong detail open / close | Review style |
| Session time pattern | Routine and energy window |
| Parent / teacher observation | Observer-side correction or added context |

Fields:

| Field | Meaning |
| --- | --- |
| signal_event_id | Unique signal id |
| student_id | Student owner |
| source_event_id | Behavior event or observer note |
| source_type | `practice`, `test`, `atlas`, `report`, `observer_note`, `session` |
| dimension_id | Related support / learning dimension |
| signal_direction | `increase`, `decrease`, `confirm`, `conflict` |
| confidence_delta | How strongly this event updates the profile |
| student_visible | Whether it can be safely summarized to student |
| observer_visible | Whether parent / teacher can see it |
| created_at | Timestamp |

Rules:

- Low-confidence onboarding dimensions should be refined here instead of extending onboarding questions.
- Daily behavior can refine profile and next-question logic.
- Daily behavior still must not directly update the dynamic learning curve; curve updates require stage / calibration tests.

For voluntary post-practice reflection, the runtime records `practice_summary_options_offered` once for a completed daily run and separately records `practice_detail_opened` or `today_atlas_opened` only when the student actively uses an option. The absence of an open is treated as a non-judgmental preference to keep reflection optional, never as an ability deficit. On recovery, the student surface reads a server-derived same-run summary that contains only prompt, stage label, scored completion state, and help usage; raw answers, answer keys, seeds, and private generation records remain server-only. The same endpoint exposes only a safe Boolean/count for whether a wrong-question replay is still available. The browser never receives source delivery IDs and cannot decide that a retry is available on its own.

#### MVP Adaptive Support Profile

The local runtime derives a versioned `adaptive_support_profile_v1` and stores its latest snapshot on `student_plans.supportProfile`. It keeps the onboarding profile as a baseline, then applies only confidence-bounded practice evidence.

| Field | Meaning |
| --- | --- |
| baseline | Initial support mode, task chunking, and confidence from onboarding |
| evidence | Compact counts and rates for independent work, hint use, retry, review, fatigue, voluntary challenge, and repeated short / interrupted visits |
| support_mode | Hint-entry preference, not a student label |
| feedback_style | `balanced_specific`, `warm_specific`, or `reflective_prompt` |
| task_chunking | Standard short chunks or recovery-sized chunks |
| challenge_pacing | `steady`, `stabilize`, or `explore_when_stable` |
| strategy_preference | A voluntary, two-distinct-question minimum ordering preference for already validated optional solution strategies |
| refinements | Action-level explanations retained for adult support |
| confidence_band | Low / medium / high evidence confidence |

Runtime boundaries:

- Under six scored practice answers, the system keeps the onboarding support mode and only records that it is still collecting evidence.
- The student sees only a gentle hint cue and feedback wording; adults see a concise action summary. Raw behavior signals and inferred labels stay hidden.
- The policy is added to the next day's allocation and question queue. It may adjust hint presentation, feedback, task chunking, and challenge share, but cannot change the dynamic curve.
- A solution-strategy preference is deliberately narrower: it can only reorder the complete optional method list after two linked questions show the same voluntary opening. It cannot remove a method, change the item, or act as a learner label.
- Repeated short or interrupted completed visits can only make the next task start with smaller self-contained chunks. They are never treated as an ability judgment and do not lower a learner's target, level, or curve.

#### Student Plan Public View

`student_plans` remains a private server record. A student receives a deliberately allowlisted public view rather than the stored plan object. It may include the learning goal, safe ability-map result, static and verified dynamic curves, learner-safe task/cadence status, knowledge-route progress, and safe queue descriptors.

It must not include `supportProfile`, daily allocation ratios, next-practice allocation, behavior-analysis snapshots, generation seeds, replay or correct-review source ids, answer rules, or configuration actor ids. Parent, teacher, and administrator observers can receive the bounded support and behavior context appropriate to their role, but generation/scoring internals remain server-only for everyone.

#### Current Matching Evidence Window

Daily allocation and adaptive support do not let a learner's earliest practice dominate indefinitely. Before those two services run, the server selects the most recent 36 trusted scored answers and only connected current-run, current-session, or current-question activity, such as hints, retries, and voluntary review. The browser attaches its active server practice-run id to interaction events, so it remains linked even when its short-lived page session id differs from the server delivery session. The stored `behaviorEvidenceWindow` records the selected answer count, total answer count, activity count, and bounded time range for auditability.

- The window is used only for next-practice composition and support presentation.
- Full trusted subject history remains available to reports, exact original-question replay, knowledge-atlas / graph evidence, and required-route progression.
- When no scored answer exists yet, a bounded recent-activity fallback preserves a calm onboarding default rather than inferring ability.
- Repeated server-recorded guided final-check states may retain a small next-day review / self-check focus. Guided reasoning text and final values remain private and are never interpreted as an answer score.
- Neither window selection nor the support policy can update a dynamic curve; formal tests remain the sole curve-calibration input.

#### MVP Observer Signal Snapshot

The server additionally derives a read-only `profile_signal_snapshot_v1` for parent, teacher, and admin reports. It is not sent to the student route. When repeated question-feature evidence is strong enough, this snapshot converts it into a short adult action such as retaining a same-structure replay; it never sends raw feature keys or values to the report.

| Field | Meaning |
| --- | --- |
| evidence_status | `collecting` before enough trusted answers, otherwise `ready` |
| answer_count | Number of server-scored answers used as the core evidence base |
| confidence | Low / medium / high confidence from answer and supporting activity volume |
| signals | At most three compact adult observations: reading-time protection, layered support, independent entry, retry recovery, reflection, exploration, answer checking, or short recovery chunks |
| action | One concrete parent / teacher response for each signal |

Rules:

- Signals are recomputed from the current subject's trusted answer evidence plus bounded activity events such as voluntary review or extra practice.
- They explain support choices; they are not diagnosis, ranking, or a fixed personality label.
- They cannot directly change level attainment or a dynamic learning curve.

---

## 7. Page 08: Learning Goal And Level Definition

Page 08 lets the student and parent confirm a target such as `G6`, but the backend must store a structured level definition behind that label.

### 7.1 Level Definition

Logical table:

```text
level_definition
```

Fields:

| Field | Meaning |
| --- | --- |
| level_id | Stable id, such as `math_cn_primary_g6` |
| subject_id | Subject, such as math / English / science |
| curriculum_system_id | Curriculum or exam system |
| level_label | Short student-facing label, such as `G6` |
| level_name | Full name, such as `小学六年级数学水平` |
| grade_band | Grade / age band |
| knowledge_scope | Required knowledge atlas nodes |
| prerequisite_scope | Critical prerequisite nodes |
| ability_dimensions | Dimensions used to judge this level |
| mastery_policy_id | Threshold rule for reaching the level |
| evidence_policy_id | Required evidence amount and recency |
| active | Whether this level can be selected |

### 7.2 Mastery Policy

Logical table:

```text
mastery_policy
```

MVP default:

| Evidence area | Default |
| --- | --- |
| Core knowledge nodes | 80%+ mastery evidence |
| Critical prerequisites | 75%+ and no repeated fragile pattern |
| Stage test confirmation | 80%+ on level-aligned verified items |
| Variant stability | Original + one-number + two-number variants correct without hints |
| Transfer / extension | At least one verified transfer or step-extension item |
| Evidence source | Test / calibration items for official level change |

Correct rate is important, but not enough alone. Level calculation also needs item level, knowledge coverage, difficulty, cognitive demand, hint independence, response time, and stage-test confirmation.

### 7.3 Student Learning Goal

Logical table:

```text
student_learning_goal
```

Fields:

| Field | Meaning |
| --- | --- |
| goal_id | Unique goal id |
| student_id | Student owner |
| subject_id | Subject for this goal |
| target_level_id | Links to `level_definition` |
| selected_by_roles | Usually student + parent, may include teacher |
| system_recommendation_id | Optional recommendation source |
| confirmation_status | draft / confirmed / needs_parent_review |
| confirmed_at | Timestamp |

#### Initial Proposal Handoff

Before the first static curve is confirmed, the local runtime uses a scoped handoff record:

```text
student_learning_goal_drafts
```

It stores `student_id`, `subject_id`, a normalized `learning_goal`, source and latest-editor roles, confirmation status, and timestamps. A linked parent or teacher may save a bounded G1-G6 target plus period, daily minutes, and weekly frequency. The student sees the proposal only after the initial subject test, may adjust the same bounded values, and confirms it together with the static curve.

Once `student_plans.staticCurveConfirmedAt` exists, the confirmed plan becomes the active source of truth. The server creates it only after a completed server-owned initial assessment and a bounded student goal confirmation. It stores the initial ability-map snapshot, adaptive support seed, static-curve confirmation actor, first task source, and `learningPathVersion` without storing answer keys or question snapshots in the plan. `math-learning-path-v4` is used for newly confirmed plans; historic plans keep their stored V2 or V3 route so later catalog growth cannot silently move their curve position. Generic browser plan writes cannot replace a `serverAuthoritative` plan; later changes go through the separate test-calibrated dynamic-curve adjustment flow.

The completed public initial-assessment result also includes the same safe server-derived ability-map snapshot used by the static-curve calculation. It carries dimensions, strengths, weak points, evidence counts, and curve guardrails, but never question answers or private item snapshots. This preserves the product order: test first, then show the multidimensional starting point, then confirm a goal and curve.

#### Server-Owned Personality Run

The combined psychological and learning-personality onboarding test is stored as a `serverAuthoritative` `assessment_sessions` record with `assessment_type = onboarding_personality`. The private record retains the scenario-template score mapping needed to produce the initial support seed. The browser receives only prompts, answer options, the student's own selected option, progress state, and a light support result; it never receives the option-score mapping. The run requires confirmed basic information and math selection, caps the combined run at twelve questions, and accepts answers only in server-defined order.

#### Server-Owned Knowledge Atlas And Optional Practice

`GET /api/knowledge-atlases/:student_id/:subject_id` creates an access-controlled knowledge-map snapshot from completed server-owned initial-test responses and server-scored practice events. Browser-claimed answers are excluded. The response contains map state, evidence counts, representative safe prompt context, and review state, but no answer keys or generation seeds.

Each daily-practice run can hold a separate `optionalPracticeSessions` collection. A session is allowed only after `requiredPracticeCompleted`, preserves private family/seed/variant descriptors on the server, and exposes only the current optional step. Same-type and harder sessions release one server-generated delivery at a time. A wrong-retry session selects only server-recorded wrong attempts from the same daily run, privately stores the original delivery reference, and regenerates the exact validated prompt rather than trusting a browser snapshot. If an optional item is completed after opening a hint or guided step, the server keeps that item active and issues one fresh, no-support delivery of the same validated prompt; only its independent correct answer releases the next optional item. All optional answers are recorded as today's behavior evidence and never alter the next calendar task.

When a protected replay delivery has a verified prior wrong attempt, or a fresh-context review is linked to an earlier independent correct answer, its safe presentation may include a `previousAttemptReference`: a gentle recall kind, student-facing intro, prior prompt, the student's own prior response, and timestamp. It intentionally excludes source question / delivery ids, correct answers, answer rules, seeds, validator traces, and unrevealed support content. The student may open this recall reference before opening a layered hint.

For an in-progress `atlas_related` exploration or `atlas_wrong_retry`, the browser may keep one local resume pointer scoped to its student and subject. That pointer contains only `delivery_id`, `family_id`, and the activity kind. It is not evidence, a plan record, or a question snapshot. On a refresh, the authenticated student surface re-reads the protected delivery, verifies its student / subject ownership and unresolved status, and then reconstructs the visible practice shell from the server-safe presentation. A completed, mismatched, or malformed pointer is cleared; prompt text, answers, answer keys, seeds, source links, and revealed support are never persisted in this pointer.

Each validated math candidate also carries three answer-safe strategy directions: relation/model, visual/table, and logical trial-and-check. These are method prompts rather than a worked numeric solution. Practice delivery may expose them alongside layered hints and guided steps; formal assessment delivery exposes no support structure.

#### Shared Math Knowledge Graph

`src/data/math-knowledge-graph.js` is the canonical relationship layer for the Shanghai-style G1-G6 math MVP. It binds every bounded question family to a family node, concept nodes, prerequisite nodes, and next-node relations. The item generator carries this binding inside its validated item tags, so a question cannot be delivered without a graph relationship.

`GET /api/knowledge-graphs/:student_id/:subject_id` returns an access-controlled graph snapshot. Each safe node includes linked question families, prerequisite and next-node identifiers, and server-evidence counts for attempts, independent work, hints, wrong-item count, coverage, and light state. It excludes prompts, answers, seeds, raw scoring rules, and unreleased generation metadata.

### 7.4 Level Evidence

Logical table:

```text
student_level_evidence
```

Fields:

| Field | Meaning |
| --- | --- |
| evidence_id | Unique evidence id |
| student_id | Student owner |
| level_id | Level being estimated |
| source_session_id | Assessment / calibration session |
| item_id | Verified question item |
| item_tags_snapshot | Tags at the time of evidence |
| result | Correct, incorrect, skipped, uncertain |
| hint_used | Whether hint support was used |
| response_time_ms | Time used |
| evidence_weight | How much this item counts |
| created_at | Timestamp |

Level evidence should preserve the item tag snapshot, because item metadata or policies may evolve later.

### 7.5 Level Attainment Decision

Logical record:

```text
student_level_attainment_decision
```

Each verified stage-test result stores the `level_definition_id`, policy version, target grade, coverage by core and prerequisite family, controlled-variant evidence, transfer evidence, and unmet-criterion codes. A verified focused test may calibrate the dynamic curve while its attainment decision remains `evidence_incomplete`; it becomes `attained` only after sufficient cross-family evidence accumulates.

---

## 8. Page 09: Study Rhythm Parameters

Page 09 collects learning intensity parameters after the goal is confirmed. These values are used to generate the first static learning curve.

These are not basic profile fields.

Logical table:

```text
student_learning_curve_parameters
```

Fields:

| Field | Meaning |
| --- | --- |
| parameter_id | Unique parameter record |
| student_id | Student owner |
| goal_id | Links to `student_learning_goal` |
| total_learning_weeks | Selected total period |
| daily_study_minutes | Selected daily study time |
| weekly_study_days | Selected weekly frequency |
| suggested_test_after_days | Soft test suggestion interval |
| mandatory_test_after_days | Mandatory test interval, observer-configurable |
| selected_by_roles | Student / parent / teacher |
| source | system_default, parent_prefill, teacher_prefill, student_confirmed |
| confirmation_status | draft / confirmed / needs_review |
| confirmed_at | Timestamp |

Downstream consumers:

```text
student_learning_goal
+ level_definition
+ student_learning_curve_parameters
+ current ability map
+ historical cohort baseline
-> initial_static_learning_curve
```

Frontend rule:

- Use standard options first, not free text.
- Form values for catalog-backed fields must use the catalog `id`, not its display or semantic `value`; birthday parts remain numeric values. This keeps student, parent, teacher, API, and assessment-routing records on one contract.
- Show simple rhythm preview to the student.
- Keep feasibility warnings gentle and action-oriented.

---

## 9. Page 10: Initial Static Learning Curve

Page 10 generates the first static learning curve from the current ability map, confirmed goal, level definition, learning rhythm parameters, and cohort baseline.

Logical table:

```text
initial_static_learning_curve
```

Fields:

| Field | Meaning |
| --- | --- |
| curve_id | Unique curve id |
| student_id | Student owner |
| goal_id | Links to `student_learning_goal` |
| parameter_id | Links to `student_learning_curve_parameters` |
| current_level_estimate_id | Ability / level estimate at generation time |
| target_level_id | Target `level_definition` |
| internal_gap_curve | Backend gap-to-target values |
| student_progress_curve | Student-facing upward progress values |
| milestone_tests | Suggested / mandatory test points |
| first_focus_sequence | Initial focus sequence, such as reading -> equation -> transfer |
| feasibility_status | feasible / tight / unrealistic |
| recommendation_options | Extend period / increase intensity if needed |
| confirmation_status | draft / confirmed / needs_review |
| confirmed_by_role | Student / parent / teacher / system |
| confirmed_at | Timestamp when accepted |
| generated_at | Timestamp |
| curve_policy_version | Version of curve generation logic |

Rules:

- User-facing display should be an upward curve.
- Backend calculation may use gap-to-target.
- Daily practice does not directly rewrite this curve.
- Dynamic curve updates require stage / calibration test evidence.

### 9.1 Curve Confirmation Event

Logical table:

```text
static_curve_confirmation_event
```

Fields:

| Field | Meaning |
| --- | --- |
| event_id | Unique event id |
| curve_id | Confirmed static curve |
| student_id | Student owner |
| actor_role | student, parent, teacher, or system |
| action | confirmed / returned_to_parameters / requested_change |
| parameter_snapshot | Goal and rhythm values at confirmation time |
| downstream_status | ready_for_daily_practice_generation |
| occurred_at | Timestamp |

After confirmation, the daily practice generator can use this curve as the starting source for the first required practice sequence.

---

## 10. Static Curve As Daily Practice Source

The confirmed static curve is not only a visualization. It is the starting source for daily practice generation.

Logical relationship:

```text
confirmed initial_static_learning_curve
+ current ability map
+ target level_definition
+ first focus sequence
+ student_learning_curve_parameters
+ question logic library
-> first daily_practice_session
```

Logical table:

```text
daily_practice_generation_source
```

Fields:

| Field | Meaning |
| --- | --- |
| source_id | Unique source id |
| student_id | Student owner |
| curve_id | Confirmed static or dynamic curve |
| source_curve_type | static / dynamic |
| source_evidence_snapshot_id | Initial test or stage-test evidence snapshot |
| focus_sequence_snapshot | Current focus sequence |
| instructional_grade | Current delivered grade range; initially comes from the confirmed baseline route and later may change only through the planned assessment / curve policy |
| eligible_family_ids | Bounded item families permitted for this day's queue |
| generation_status | ready / generated / superseded |
| created_at | Timestamp |

Rules:

- First-day practice must come from a confirmed static curve.
- Later daily practice can use the latest confirmed curve plus yesterday's practice behavior.
- Daily practice behavior adjusts tomorrow's question allocation, including a private per-family evidence-weighted estimate that treats independent and hint-supported completion differently, but does not itself update the curve.
- A higher target level cannot by itself skip the current `instructional_grade`; all daily queue families must be eligible for that grade.
- A `challenge_extension` may enter a graph-linked successor only after the anchor and every named family prerequisite have repeated, sufficiently accurate independent evidence. Otherwise it stays in the same family with a deeper validated variation.
- Stage / calibration tests update the dynamic curve using the same scoring rule as the static curve.

## 11. Dynamic Curve Recalculation

Logical table:

```text
dynamic_learning_curve_update
```

Fields:

| Field | Meaning |
| --- | --- |
| update_id | Unique update id |
| student_id | Student owner |
| previous_curve_id | Static or prior dynamic curve |
| new_curve_id | New dynamic curve |
| trigger_type | stage_test / calibration_test / mandatory_test |
| evidence_snapshot_id | Test evidence used for recalculation |
| scoring_policy_version | Same policy family as static curve |
| target_level_id | Same target unless student / parent changes goal |
| parameter_change_option | keep_intensity, shorten_time, raise_target, extend_period, increase_intensity |
| selected_daily_minutes | Daily study minutes after adjustment |
| selected_weekly_days | Weekly study frequency after adjustment |
| selected_total_weeks | Total study period after adjustment |
| preview_curve_id | Generated preview curve before confirmation |
| default_option | Usually keep_intensity |
| created_at | Timestamp |

Core rule:

```text
Static curve and dynamic curve use the same scoring rule.
Only the evidence snapshot changes.
```

Page flow:

```text
Page 16 test reminder
-> Page 17 stage test
-> Page 18 dynamic curve update
```

Additional event tables:

```text
stage_test_reminder_event
stage_test_attempt_event
dynamic_curve_choice_event
```

### 11.1 Observer-Initiated Test Invitation

The confirmed `student_plans.assessmentCadence` record also carries one optional, temporary invitation state:

| Field | Meaning |
| --- | --- |
| observer_requested_at | Timestamp of a linked parent / teacher request |
| observer_requested_by_role | Parent / teacher / admin, retained for audit only |
| observer_requested_by_user_id | Authorized requester |
| observer_request_status | `requested`, `skipped`, or `completed` |
| observer_request_acknowledged_at | Student skip or completed-test timestamp |
| observer_request_acknowledged_by_role | Usually `student` |

Rules:

- A linked parent or teacher may create the invitation only after a confirmed plan exists.
- An active invitation makes the existing stage-test cadence `suggested`; it does not force a test and it does not change the dynamic curve.
- The student is not shown who requested it. The same student actions remain: open the shared test surface, start, or skip today.
- Skipping or completing the test acknowledges this one invitation. A later parent / teacher request creates a fresh timestamped invitation.
- A mandatory cadence window always overrides the invitation's optional status.

Rules:

- Page 16 student actions are start test or skip today. Parent / teacher test-interval configuration belongs to observer settings.
- Page 17 reuses the assessment module and question logic library, without Help You Learn support. Its persisted blueprint records a bounded cross-family sample: target-level core coverage, direct prerequisite checks where available, controlled variants, transfer evidence, and a rotation index.
- Page 18 compares static and dynamic curves after test evidence is available.
- If the dynamic curve is ahead of static, default option is keep intensity: daily time and weekly frequency stay unchanged, expected terminal level rises naturally.
- Alternative option is keep original target and shorten expected completion time.
- Student / parent / teacher can adjust learning intensity parameters and generate a new dynamic curve preview before confirming.
- Student-facing parameter controls are simplified; observer / backend views can expose deeper parameters and rationale.

---

## 12. Page 11: Today Practice Entry

After a static curve is confirmed, the student enters the daily learning flow. The student-facing daily task has one required action: start practice.

Entry points:

```text
main navigation: 今日任务 / 今日练习
calendar date cell
homepage continue action
current learning-curve node
```

All entry points resolve to the same `today_practice_session`.

Logical table:

```text
today_practice_session
```

Fields:

| Field | Meaning |
| --- | --- |
| session_id | Unique daily session |
| student_id | Student owner |
| source_curve_id | Confirmed static or dynamic curve |
| source_curve_type | static / dynamic |
| date | Practice date |
| entry_source | navigation / calendar / homepage / curve |
| required_action | Usually `start_practice` |
| focus_nodes | Today's knowledge / ability focus |
| planned_question_mix | Backend question mix for today |
| status | not_started / in_progress / completed / missed / light_makeup |
| generated_at | Timestamp |

Student-facing rule:

- Show only simple information: today’s focus and start action.
- Do not show a checklist of separate internal tasks.
- Do not expose exact question count if it creates rushing behavior.
- Do not open future formal daily tasks in advance. Future tasks are generated after new evidence arrives.

### 12.0 Future Task Boundary

Formal future daily tasks should not be pre-generated or unlocked for the student.

Reason:

```text
today performance
-> tomorrow question allocation
```

If future tasks are locked in advance, the system loses the daily one-to-one adjustment loop.

Allowed after completing today's required practice:

- optional extra same-type practice
- optional harder same-type practice
- optional wrong-question retry
- optional knowledge-atlas review

Logical table:

```text
optional_extra_practice_session
```

Fields:

| Field | Meaning |
| --- | --- |
| extra_session_id | Unique extra practice session |
| student_id | Student owner |
| required_session_id | Today's completed required practice |
| extra_type | same_type / harder_same_type / wrong_retry / atlas_related |
| selected_quantity | Student-selected amount, such as 3 / 5 / 8 |
| source_date | Same date as required practice |
| affects_future_calendar | Always false |
| behavior_signal_use | Voluntary practice, challenge preference, stamina, mastery confidence |
| created_at | Timestamp |

Extra practice counts as today's behavior evidence and can influence tomorrow's question allocation. It does not consume or lock future calendar tasks.

If the student repeatedly chooses extra practice, the system may later recommend:

- increase daily intensity
- shorten expected completion time
- raise target level
- add optional challenge track

### 12.1 Missed Today Task Policy

If the student misses a daily task, the system should not simply stack yesterday’s full task onto today.

Default policy:

```text
next day task =
light makeup of yesterday's key unfinished part
+ today's core practice
```

Rules:

- Missed 1 day: remind student gently.
- Missed 2 consecutive days: notify parent.
- Missed 3 consecutive days or frequent weekly misses: notify parent and teacher.
- Repeated missed sessions: suggest adjusting learning rhythm parameters.
- Missed sessions become behavior signals for routine stability, reminder strategy, and next-question allocation.

Logical table:

```text
daily_practice_missed_event
```

Fields:

| Field | Meaning |
| --- | --- |
| missed_event_id | Unique event id |
| student_id | Student owner |
| session_id | Missed daily session |
| missed_date | Date missed |
| consecutive_missed_days | Current missed streak |
| weekly_missed_count | Count in current week |
| student_action | ignored / resumed / light_makeup_started / light_makeup_completed |
| notification_level | student_only / parent / parent_teacher |
| generated_makeup_session_id | Optional light-makeup session |
| created_at | Timestamp |

Light makeup is a support mechanism, not a punishment. It prioritizes key unfinished evidence and avoids making the student feel they owe an impossible backlog.

### Subject Boundary for Behavior Evidence

Every new behavior event carries `subject_id` at the record level and inside its payload. Client hydration, learning reports, knowledge maps, and daily matching query the same subject boundary. Older prototype events without a subject marker remain readable only as temporary one-subject compatibility records; they must not be emitted by new flows.

---

## 13. Page 12: Practice Runtime

Page 12 is the student-facing practice runtime. Unlike assessment mode, practice mode can expose Help You Learn support.

Runtime modes:

```text
assessment_mode = no layered hints, records positioning evidence
practice_mode = learn by doing + layered hints + retry / variants
```

Logical table:

```text
practice_attempt_event
```

Fields:

| Field | Meaning |
| --- | --- |
| attempt_event_id | Unique event id |
| student_id | Student owner |
| practice_session_id | Today practice session |
| item_id | Question item |
| variant_depth | original / original_retry / one_number / two_numbers / step_extension |
| answer | Student answer |
| is_correct | Whether answer is correct |
| attempt_count | Attempt count for this item / variant |
| hint_depth_used | Number of hint layers opened |
| response_time_ms | Time used |
| answer_revision_count | Bounded count of answer changes before submission; raw draft values are never stored |
| next_runtime_action | retry_original / one_number_variant / two_number_variant / next_item |
| created_at | Timestamp |

Rules:

- Practice pages should not show exact question count.
- Wrong answer first routes to original retry.
- Then one-number variant.
- Then two-number variant.
- All correct routes the student into the next question. The UI should not present this as a separate task group.
- Hint layers are opened one at a time and recorded as behavior data.
- Guided step-by-step mode can be opened later from the same verified support structure.
- Answer revision is kept only as a bounded count for later behavior analysis; the system never saves a student's draft answer sequence.

---

## 14. Page 13: Practice Completion / Extra Practice Choice

Page 13 appears only after today's core practice is complete. It is a light completion page, not a report page and not the knowledge atlas itself.

Logical table:

```text
practice_completion_choice_event
```

Fields:

| Field | Meaning |
| --- | --- |
| completion_choice_id | Unique event id |
| student_id | Student owner |
| practice_session_id | Today practice session |
| core_practice_completed | Whether required daily practice is complete |
| selected_action | extra_practice / harder_extra / atlas_today / item_detail / return_today |
| does_consume_future_task | Always false for extra practice |
| created_at | Timestamp |

Rules:

- Extra practice is voluntary and appears after core practice completion.
- Extra practice does not consume tomorrow or future calendar tasks.
- Wrong/correct detail views can provide secondary extra practice entry points.
- Choice behavior becomes an input to tomorrow's question logic.

---

## 15. Page 14: Today Item Detail

Page 14 is an optional student-facing detail view after practice completion. It is not a report page and should not expose backend profile labels.

Logical table:

```text
today_item_detail_event
```

Fields:

| Field | Meaning |
| --- | --- |
| detail_event_id | Unique event id |
| student_id | Student owner |
| practice_session_id | Today practice session |
| topic_id | Selected topic / question type |
| opened_from | completion_page / report / atlas / practice_summary |
| selected_action | open_detail / retry_once / same_type_extra / harder_extra / atlas_link |
| dwell_time_ms | Time spent in detail view |
| created_at | Timestamp |

Rules:

- Student sees a topic map and short selected-topic details.
- Student can choose retry once, same-type extra practice, harder extra practice, or atlas link.
- Student should not see profile labels, guessing labels, weakness diagnoses, exact algorithm ratios, or parent / teacher analysis.
- Detail behavior feeds tomorrow's question logic and longer-term behavior profile refinement.

---

## 16. Page 15: Knowledge Atlas Entry

Page 15 is an optional student-facing atlas entry after practice. It is a归纳 space, not a required lesson and not a textbook.

Logical tables:

```text
knowledge_node
knowledge_atlas_event
```

`knowledge_node` fields:

| Field | Meaning |
| --- | --- |
| knowledge_node_id | Unique node id |
| subject_id | Subject owner |
| display_name | Student-facing short name |
| plain_understanding | Plain-language understanding |
| formal_expression | Professional expression |
| visual_formula | Simple formula / relationship / diagram text |
| prerequisite_node_ids | Prior knowledge nodes |
| next_node_ids | Related future nodes |
| linked_question_type_ids | Question types generated from this node |

`knowledge_atlas_event` fields:

| Field | Meaning |
| --- | --- |
| atlas_event_id | Unique event id |
| student_id | Student owner |
| practice_session_id | Related practice session when opened from today |
| knowledge_node_id | Selected node |
| opened_from | completion_page / item_detail / report / free_explore |
| selected_action | open_node / related_question / wrong_items / learn_ahead |
| dwell_time_ms | Time spent |
| created_at | Timestamp |

Rules:

- Atlas is optional; daily learning still starts from doing questions.
- Student atlas UI should be visual-first: puzzle / constellation, highlighted today nodes, dim related future nodes.
- The knowledge card should stay light: one plain-language explanation, one professional expression, and one simple visual/formula.
- Atlas content and question generation share the same knowledge graph.
- Opening or skipping atlas is behavior data and can affect tomorrow's question logic and long-term interest/profile signals.
- A `learn_ahead` atlas action creates an independent `atlas_related` delivery. It uses the same validated question-family graph and help routes as practice, but has no daily-practice-run id and cannot consume calendar work or recalibrate the curve.
- A completed or requested atlas exploration contributes only to voluntary-exploration behavior evidence. It may help tune the next-day question mix and support profile after enough evidence, never a formal level score or dynamic curve.

---

## 17. Page 19: Knowledge Atlas Overview

Page 19 is the full student-facing knowledge atlas overview. It combines knowledge-node coverage and related practice history.

Logical derived view:

```text
student_knowledge_node_coverage_view
```

Fields:

| Field | Meaning |
| --- | --- |
| student_id | Student owner |
| knowledge_node_id | Knowledge node |
| coverage_status | not_started / touched / developing / stable |
| coverage_percent | Approximate student-facing coverage |
| visual_light_state | dark / dim / partial / bright |
| related_question_count | Related attempted question count |
| wrong_item_count | Wrong items linked to this node |
| last_practiced_at | Last practice time |
| next_action | related_question / retry_wrong / harder_variant / light_review |

Rules:

- Atlas overview shows coverage state and practice history in one place.
- Atlas overview should feel like a light-up map: confirmed mastery is bright, developing knowledge is partially lit, and unexplored knowledge remains dark.
- A knowledge node can be opened to see related questions, wrong items, and next actions.
- Student-facing atlas avoids long lesson text and focuses on map state plus action.
- Coverage is derived from test evidence, practice history, question tags, wrong items, and variant stability.
- `visual_light_state` is derived from the same evidence as coverage; the frontend does not invent mastery state from color alone.
- Dark unexplored nodes can still appear on the map so student, parent, and teacher roughly know where the learner is and what territory remains.

---

## 18. Page 20: Role-Based Reports

Page 20 shows the same report evidence rendered at different depths for student, parent, and teacher.

Logical derived view:

```text
role_based_learning_report_view
```

Evidence inputs:

| Input | Used for |
| --- | --- |
| static_curve / dynamic_curve | Growth path, target progress, curve change |
| stage_test_attempt_event | Official level / curve update evidence |
| practice_attempt_event | Correctness, retry, hint use, response time, bounded answer-revision count, variant depth |
| today_item_detail_event | Voluntary review and extra-practice behavior |
| knowledge_atlas_event | Knowledge curiosity / review behavior |
| student_knowledge_node_coverage_view | Knowledge coverage and wrong-item links |
| daily_practice_generation_source | Why tomorrow's practice is assigned |
| student_message | Parent / teacher note stored as bounded plain text and rendered as text, never executable markup |

Learning behavior metrics:

| Metric | Meaning |
| --- | --- |
| total_study_time_minutes | Total learning time in the report window |
| longest_session_minutes | Longest single session |
| shortest_session_minutes | Shortest valid single session |
| hint_open_rate | Share of items where hints were opened |
| hint_free_accuracy | Correct rate without hints |
| post_hint_accuracy | Correct rate after one or more hint layers |
| retry_success_rate | Success rate after original retry / wrong-item retry |
| variant_transfer_rate | Success rate from original to one-number / two-number variants |
| answer_revision_rate | Share of recorded attempts with one or more answer changes before submission; never exposes draft values |
| average_answer_revision_count | Average bounded revision count across attempts where this privacy-safe signal was collected |

### server_learning_report_snapshot

The MVP report is a server-generated, read-only snapshot rather than a browser-owned calculation. It is derived on request from the student's subject-scoped behavior events, confirmed learning plan, and formal assessment records.

| Field | Meaning |
| --- | --- |
| student_id / subject_id | Report scope and access boundary |
| audience | `student`, `parent`, `teacher`, or `admin`, derived from the authenticated session |
| trusted_answer_count | Number of server-scored attempts included in accuracy, timing, hint, retry, and transfer metrics |
| excluded_untrusted_answer_count | Legacy or browser-claimed answer records excluded from those metrics |
| learning_metrics | Study time, sessions, accuracy, hints, retries, variants, and voluntary practice summary |
| ability_evidence | Tagged practice evidence by ability dimension and atlas node |
| ability_map | Working multidimensional ability map from the completed initial test plus server-scored practice only |
| curve_summary | Current static or verified dynamic curve position; no browser calculation is trusted here |
| test_history | Safe initial- and stage-test summaries, including only aggregate initial-test uncertainty / skip counts and never private question snapshots or answers |
| learning_trend | A report-only summary that keeps two bounded views separate: server-scored practice windows for independent-completion / correctness behavior, and verified formal-test summaries for formally checked change |
| next_step | Confirmed-curve or server-matching focus for the next practice action |
| tagged_question_evidence | Teacher / admin-only compact summary of server-scored question families, instructional grade, variant coverage, knowledge-tag count, ability-tag count, and independent completion; never includes answers, prompts, seeds, or private generation data |

Rules:

- Only `answer_submitted` records marked `server_authoritative` contribute to report correctness, answer timing, and hint-rate metrics.
- The working ability map may change as trustworthy practice evidence accumulates, but the report guardrail remains: only a completed verified formal test can recalibrate the dynamic curve.
- `learning_trend` waits for repeated evidence, uses no raw prompts or answers, and never converts hint-supported completion into an incorrect answer. Practice trend cannot update a curve; only the stored verified formal-test result can do that.
- Rhythm events such as visits, pauses, atlas opens, and retry choices may enrich the report but do not update a dynamic curve.
- The snapshot returns no private candidate, answer rule, unrevealed support structure, or assessment answer.
- Student, parent, and teacher receive the same core objective evidence through access-controlled routes; the teacher / admin route may additionally receive the bounded `tagged_question_evidence` summary for instruction planning.

Peer / cohort reference metrics:

| Metric | Meaning |
| --- | --- |
| peer_group_definition | Similar age / target / starting level / study rhythm group |
| peer_position_band | Student-facing band, not hard rank |
| peer_trend_delta | Change versus prior report window |
| peer_strength_signal | Where student is ahead of similar peers |
| peer_support_signal | Where student is behind or near median and needs support |
| peer_trend | A bounded own-practice direction from two server-scored windows; shown as gentle momentum, never as a historical percentile claim |

Role rendering:

| Role | Report depth |
| --- | --- |
| Student | Gentle progress, visual stats, knowledge coverage, next action; no backend profile labels |
| Parent | Completion, rhythm, behavior patterns, result trend, support suggestions |
| Teacher | Diagnostic dimensions, item patterns, hint / retry behavior, intervention and algorithm recommendations |

Rules:

- Reports are based on objective behavior and learning evidence, not subjective labels.
- Student report should avoid pressure, hard ranking, and negative profile terms.
- Parent and teacher can see deeper behavior analysis, but should still be chart-first and actionable.
- Reports must distinguish test evidence from practice behavior: tests update curves; practice updates next-question logic.
- Reports should filter for precision. The data layer may contain many metrics, but first-screen reports should show only the few metrics needed for the current role's decision.
- Peer reference should be framed as a trend and context signal, not a pressure-oriented rank, especially in the student view.
