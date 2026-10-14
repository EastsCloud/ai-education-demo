# AI Education Sprint Status

## 2026-09-07: Five-Learner End-To-End System Test

- [x] Added a repeatable system journey that creates five new students, five parents, and one shared teacher through the public account and relationship APIs, then uses independent authenticated sessions for every role action.
- [x] Each learner completes the full durable path: basic context, both personality layers, Math selection, initial ability assessment, goal and static curve, three learning days with seeded-random answers, formal stage assessment, dynamic curve, knowledge coverage, and role-specific reports.
- [x] Retained the complete run in `data/system-e2e-final.sqlite`, including 15 assessment sessions, 15 daily runs, 207 question deliveries, 321 behavior events, ten adult messages, and enough same-target evidence for a five-learner anonymous peer reference.
- [x] Verified real student, parent, and teacher sign-in and account switching in the browser. Fixed observer behavior hydration, the knowledge-graph API envelope, teacher peer-module migration, and local-date generation discovered by that review.
- [x] All 96 system contracts pass after the fixes. The final human-readable evidence is in `output/test-reports/system-e2e-final-report.md`.

## 2026-09-07: Shared Demonstration And Reliable Account Switching

- [x] The local demonstration now uses one shared learner session across student, parent, and teacher entrances. Practice, learning time, hints, retries, knowledge coverage, curves, personality support, and observer messages therefore describe the same student rather than three disconnected mock records.
- [x] Parent and teacher remain optional observers. A student-only session can complete onboarding and learning independently; selecting an observer role only changes the permitted view of the same evidence.
- [x] Authenticated account switching now signs out before opening sign-in, preventing the former redirect loop. Demonstration account switching returns to the role selector while preserving the shared learner session.
- [x] Fresh local learning days resolve from the current date instead of inheriting an old seeded prototype date.
- [x] Parent or teacher messages written in the shared demonstration are visible in the student's report without exposing private observer analysis.

## 2026-09-07: Demonstrable Semi-AI Learning Loop

- [x] Verified one continuous demonstration path from role selection through onboarding, the bounded Math assessment, ability map, goal and rhythm confirmation, static curve, daily practice, cumulative Help You Learn hints, required retry and number variants, voluntary extra practice, knowledge atlas, and role-specific reports.
- [x] The Semi-AI question path remains bounded and validation-gated; answer keys, seeds, generation traces, behavior interpretations, and allocation policy stay outside learner responses.
- [x] Student and observer layouts were checked at desktop and student mobile widths for horizontal overflow and interactive overlap.

## 2026-09-06: Explicit Student Subject Selection

- [x] Repaired the onboarding sequence so basic context is followed by psychological personality, learning personality, a visible subject choice, then the matching ability test. Math is no longer silently selected while the student is filling in basic information.
- [x] A parent or teacher may still prefill a subject, but it remains a suggestion until the student confirms it. Student-only onboarding uses the same server-owned path and never requires an adult relationship.
- [x] The initial Math assessment now rejects both missing student subject confirmation and missing completed personality evidence. Local demonstrations preserve the same confirmation marker, so the offline visual path and authenticated path do not disagree.
- [x] The observer start view now truthfully shows “waiting for the student to choose Math” when that is the next action, rather than skipping ahead to goals or a test.

## 2026-09-06: Fresh Demo Entry Consistency

- [x] Every local student demo link now starts from the same blank onboarding baseline as a new student, even when an older link omits the `entry=onboarding` parameter.
- [x] The bootstrap and student runtime use one shared entry-policy check, preventing a future cache or route change from sending a demo learner to a seeded home page.

## 2026-09-06: Safe Personality-Driven Support Presentation

- [x] The server now passes only three student-safe presentation choices from the private support profile into a daily practice plan: help-entry wording, a structured guided-entry preference, and a voluntary review invitation style.
- [x] The practice surface uses those choices without exposing personality scores, support labels, behavior analysis, or allocation logic.
- [x] Task chunking and challenge pacing remain server-side matching controls; daily feedback and these presentation choices make the onboarding support seed visible in a calm, bounded way.

## 2026-09-06: Target Confirmation Report Boundary

- [x] Recomputed the current math target-attainment decision from stored, target-scoped formal-test evidence when generating a learning report.
- [x] Exposed only compact, student-safe evidence lanes: formal test, core scope, prerequisites, stable number changes, and transfer across wording.
- [x] Separated the report's learning-path progress ring from official target confirmation so an upward curve never overstates a confirmed grade level.
- [x] Parent and teacher reports now prefer that same recomputed evidence snapshot over an older persisted test decision, so every role sees the same target-confirmation outcome.
- [x] Added contract coverage for the new report boundary and confirmed that prompts, answers, and question ids remain private.

## 2026-09-06: Initial Personality Support Actions

- The combined onboarding personality assessment now produces a private, versioned action policy rather than only a descriptive profile.
- Its bounded actions affect entry chunking, feedback style, help entry wording, guided-structure preference, review invitation style, and whether later independent evidence can retain a small exploration window.
- The policy is preserved in the server-owned learning plan, but only its calm learner-facing effect reaches practice. It never labels a student, exposes internal scores, bypasses the independent-evidence gate for challenge items, or changes either learning curve.

## Current Mode

Isabel development mode is active.

The current focus is system development, not investor materials.

## 2026-09-06: Verified Fraction Answer Input

- The bounded same-denominator addition and subtraction families can now ask for a fractional share in a real-world context, rather than converting every response into a whole-number quantity.
- A student writes a fraction as `a/b`. Equivalent forms such as `3/6` are normalized for accurate scoring and review, while a decimal entry is deliberately rejected for this response type.
- The same verified input contract now works in daily practice, Help You Learn's final guided step, initial assessment, formal stage testing, server scoring, and the knowledge-atlas evidence path. Only a validated question family may request it.

## 2026-09-06: Recoverable Bounded Behavior Events

- If a student's browser briefly loses its connection or closes at the wrong moment, locally retained non-score activity is retried on the next authenticated visit.
- Recovery is idempotent through the event id and stays deliberately narrow: it can restore bounded visit, navigation, and support-use evidence, but it never recreates a question score or answer value from browser storage.
- This preserves the existing rule that correctness, mastery, formal-test evidence, and curve updates remain server-owned.

## 2026-09-06: Fresh Student Entry Integrity

- The local student experience now creates an isolated onboarding session for each new entry from the role page. Refreshing preserves that learner's current setup, while starting a new experience does not inherit another demo learner's profile, answers, or learning history.
- A new learner's standard-input fields are genuinely blank until chosen. The first screen never silently selects a birth year, month, grade, device, or learning preference.
- Native hidden flow states are now authoritative over component layout styles. The onboarding surface therefore shows only the current step: basic context first, then psychological personality, learning personality, subject selection, ability assessment, goal, rhythm, and static curve.
- Offline demonstrations now use the bounded local personality and ability logic after context confirmation. Authenticated students continue to use the server-owned assessment path; the demo no longer waits forever for a protected server session it does not have.

## 2026-09-06: Student-Only Learning Path

- A student can now create a self-scoped account with a current-grade selection and immediately enter onboarding; no parent or teacher record is created or required.
- The student owns the same authoritative path from basic context through personality and subject assessment, first curve confirmation, and daily practice.
- Adult-created profiles and adult prefill remain available as optional collaboration paths, never as prerequisites. A student can later generate a one-time parent or teacher connection code from account settings.

## 2026-09-06: Reliable Learning-Session Capture

- The final active-time snapshot now uses a browser exit beacon, with a keep-alive request as a fallback, so closing a tab does not normally lose a student's last learning visit.
- The stored exit event remains deliberately narrow: active time, elapsed time, entry hour, pauses, and the last page only. It never carries browser-scored answers, private writing, or a browser-declared level.
- The behavior-event contract verifies that this session record is accepted through the same allowlisted, student-authorized server path as other bounded activity.

## 2026-09-06: Quieter Student Onboarding Surface

- A new student now meets one compact starting-information action instead of multiple explanatory panels and empty “waiting” cards.
- The basic-information preview appears only after confirmation. It is a small, editable snapshot; the long explanation of data rationale and a simulated bypass path are no longer part of the student journey.
- The ability result map is now a route-based constellation with visible progress rings, short node labels, one current focus, and one existing strength.

## 2026-09-06: Focused Student Home

- The home page now expresses today's work as one light, data-backed practice entrance: date, focus, learning cadence, estimated time, and a single start action.
- The knowledge-map band keeps the visual map and its optional entrance, without adding explanatory copy the learner does not need before beginning.
- The change does not alter matching, task cadence, or the curve; it only makes the current server-owned plan easier to read.

## 2026-09-05: Resumable Atlas Practice

- A student who refreshes during a voluntary atlas exploration or an atlas original-question replay now returns to that same server-owned delivery instead of being silently dropped back into the daily queue.
- The browser stores only a short resume pointer: student, subject, delivery id, family id, and activity kind. It never stores a prompt, answer, answer key, seed, support trace, or source-delivery relationship.
- On return, the signed-in student re-fetches the safe delivery from the server. Completed, mismatched, or invalid pointers are cleared, and an unavailable connection leaves the pointer untouched for a later retry.

## 2026-09-05: Atlas Wrong-Question Replay

- The knowledge atlas now turns an unresolved wrong item into a voluntary `重做原题` action instead of exposing an answer list. The server verifies that the item belongs to the signed-in student, recreates the exact validated original, and keeps the replay outside the required daily task and learning-curve evidence.
- Before opening hints, the replay offers the learner a voluntary view of the original prompt and their own prior answer. The browser receives a formatted display value only, including `HH:MM` for clock answers; canonical values, source ids, seeds, answer keys, and generation traces remain server-side.
- The public atlas no longer serializes empty answer-key fields. The new route is covered by a time-question contract that checks authorization, original-item identity, formatted prior work, server scoring, and resolved-item blocking.

## 2026-09-05: Shared Assessment Answer Inputs

- The answer-input contract now runs through initial ability testing and formal stage testing as well as daily practice. A future verified item can request either a numeric answer or a clock-time answer without asking the learner to translate a time into an internal minute value.
- The browser receives only the safe input definition. The server normalizes and stores the canonical value for scoring, while answer keys and item-generation traces remain private.
- The no-help formal-test boundary is unchanged: reusing the answer-input contract changes only how a learner enters an answer, never what test evidence can update a learning curve.

## 2026-09-05: Typed Clock-Answer Delivery

- Time questions can now use a verified `HH:MM` learner input rather than pretending a clock time is an ordinary number. The server normalizes the student entry to minutes only for scoring; browser payloads still exclude answer keys and answer rules.
- The time-elapsed family now has both verified R1 reverse questions (find the start time) and M1 real multi-step questions (find the ending time after two activities). Both forms are generated inside declared boundaries, tied to visible clocks and durations, and use the same validation gate as every other question family.
- The same answer-input contract now reaches regular practice, Help You Learn's final guided step, safe recall of a prior answer, server scoring, and the downloadable guided process. A future answer type must meet this whole-path requirement before it can be assigned.

## 2026-09-04: Guided Extension Delivery

- The verified same-family S1 and S2 challenges now unfold inside Help You Learn instead of adding hidden-only solution steps. Standard practice keeps four hint layers; S1 adds an information-organization response step, and S2 adds both information organization and a calculation-plan response step before calculation.
- The full guided path, its private evidence bindings, public step count, and student-safe learning-path labels must agree before a question can be delivered. The normal four-step path remains unchanged for original and number-variation practice.
- Guided-response events now retain only the safe step category (for example, read, organize, plan, or calculate), never the student's written reasoning. This makes the added steps available to later behavior matching without turning them into a score or learner label.
- Across at least two separate questions, voluntary use of the organization or planning steps can preserve a gentle structured-guidance entry for later practice. It cannot lower or raise an ability estimate, alter an answer score, or update either learning curve.
- A third voluntary same-family harder request may use a bounded reverse-question form only where that family declares a verified inverse relation. A fourth and later request may use an authored multi-step application form only where the same family declares its own answer boundary and semantic rule shape. All forty-one current math families now validate both forms before delivery, including elapsed-time start and end clock questions. Required daily practice, formal tests, and curve evidence remain unchanged.
- Help You Learn now derives three real, answer-safe solution approaches from the same item model: a relation path, a domain-specific visual or table path, and a logical-trial or reverse-check path. Each strategy must match the candidate's own solution steps and declared strategy IDs before delivery; the Full-AI-ready gate compares the entire strategy set with the canonical candidate.

## 2026-09-04: Independent Challenge Evidence Boundary

- Challenge pacing now separates help-supported completion from independent transfer. A hint-assisted harder answer can refine later support, but it cannot raise the challenge share or open an exploration pace.
- A small acceleration needs at least three voluntary-practice requests plus two no-hint R1 reverse-question or M1 real-two-step attempts with at least 75% success, adequate independent overall accuracy, and no fatigue signal. The rule is bounded, confidence-weighted, and changes only next-practice composition.
- The same independent boundary now protects standard number-variation challenge increases, adaptive support pacing, adult profile signals, and local practice metrics. It never changes a required route, original result, level judgment, or learning curve.

## 2026-09-04: Verified Optional Harder Practice

- A same-family “harder” choice now creates a validated, student-visible information-organization extension rather than repeating the required two-number variation. Its first voluntary item adds one thinking step; the second adds two; the third can use a verified inverse form; and the fourth can introduce one real additional calculation relationship, each only where that family explicitly supports the form.
- When verified prerequisite evidence supports it, the existing graph-linked next-family route remains available. Both routes stay voluntary and cannot advance the formal curve or required daily path.

## 2026-09-04: Observer Onboarding Readiness

- The parent and teacher overview now shows a compact five-stage start path: student context, learning preference, Math ability, goal, and the confirmed static curve.
- It reads a server-owned status-only snapshot, gives only the currently relevant next action, and never exposes a learner's answers, score mappings, basic-info fields, or question-generation internals.

## 2026-09-04: Resilient Observer Entry

- Parent and teacher entry now keeps every observer workspace hidden until role confirmation, so no student name or record appears before the protected session resolves.
- A bounded session wait now returns an unavailable observer session to the safe sign-in route instead of leaving the page in a permanent loading state.
- A temporary observer-data read failure now shows a clear retryable state after sign-in rather than presenting an empty student relationship as if no student were linked.

## 2026-09-04: Observer Personality Sync

- Parent and teacher workspaces now hydrate the completed psychological and learning-personality run separately from the Math ability assessment.
- The observer's learning-support view therefore uses the same safe, server-owned 12-item results the student completed, then adds later behavior signals without exposing score mappings or private question snapshots.

## 2026-09-04: Resilient Student Entry

- Student entry now has a bounded wait for session confirmation, so a stalled local runtime cannot leave a learner on the loading screen indefinitely.
- When the learning space cannot be prepared, the page returns to the safe sign-in route with a calm transition message. Normal authenticated routing remains unchanged.

## 2026-09-04: Prior-Work Recall For Practice

- A student can now optionally open their own prior work before help in both relevant practice cases: exact replay after a wrong answer, and a fresh-context review after an earlier independent correct answer.
- The two cases use different gentle wording. The feature respects the original correct result and does not label it as uncertain or unstable.
- The browser receives only a recall kind, prior prompt, the student's own answer, and a short intro. Source delivery ids, question ids, seeds, answer keys, and scoring internals remain server-only.

## 2026-09-04: Student-Safe Plan Boundary

- The server now returns an explicit student-safe plan view instead of serializing the stored plan directly to the learner.
- Students retain the information they need to learn: ability map, goal, curve, task status, safe question descriptors, and formal-test history.
- Hidden support-profile interpretations, behavior-analysis snapshots, allocation ratios, seeds, source-delivery links, and configuration-actor ids remain out of the student plan response.
- Parent, teacher, and administrator views retain their observer context; all roles remain unable to receive generation and scoring internals.

## 2026-09-04: Traceable Correct-Answer Review

- A correct-review slot can now bind privately to a concrete earlier no-hint original answer, instead of only selecting its broad question family.
- The learner receives the same mathematical relationship in a fresh real-world context, then follows the familiar one-number and two-number changes. The original correct result remains untouched.
- Wrong-answer replay remains separate: it starts from the exact original prompt and may show the learner's own prior response before help. Correct-review source ids, seeds, answers, and any interpretation remain server-only.
- A dedicated end-to-end contract verifies the private linkage, the new-context delivery, and the absence of the linkage from the public plan and student delivery.
- The server now stores that linkage with the trusted answer event, turns the new-context result into bounded reproduction evidence, and strips both wrong-replay and correct-review source identifiers from browser responses and event hydration.

## 2026-08-06: Verified Application Contexts

- Every executable Math question now carries a private, versioned application-context certificate. It binds the visible prompt to a real-world scenario cue and a clear question goal, so a valid calculation alone is no longer enough for delivery.
- The same gate applies to the bounded Semi-AI generator and the future Full-AI provider path. A stripped expression, a missing question, or mismatched context metadata is rejected before it can become a student question.

## 2026-08-06: Evidence-Bounded Learning Trends

- Reports now derive a dedicated, server-owned trend snapshot rather than treating a changing daily queue as academic growth. It compares two bounded windows of trusted practice for overall correctness and independent completion, while keeping those signals separate so a correct answer never becomes "less correct" because help was used.
- A second, separate formal-test trend appears only after two verified stage tests. It can describe confirmed movement without exposing prompts, answers, seeds, or internal generation data.
- The student report receives one quiet visual line and supportive wording. Parent and teacher reports receive the same evidence with the formal-test context and a bounded action interpretation. Neither trend may relabel a student, create a rank, or update the dynamic learning curve.

## 2026-08-06: Student Report Entrances

- The student report now gathers the optional things a learner may want after required practice into the existing report surface: a voluntary return to today's correct / incorrect items, a knowledge-atlas entry, and one current parent / teacher message.
- These are small commands inside the report, not extra student navigation. Opening them records only bounded navigation / review activity and never exposes a profile label or changes the learning curve.

## 2026-08-05: Family-Level Semi-AI Matching Evidence

- The daily matching engine now estimates a private, confidence-bounded mastery signal for each current math family from recent trusted server-scored answers. Independent success adds stronger positive evidence than hint-supported completion; controlled variants and reading-form transfers receive carefully bounded extra evidence.
- When several independently correct families are eligible for a review slot, the system now confirms the one with the lower evidence-weighted confidence first. A newer wrong answer still has priority, so the original -> retry -> controlled-variation path remains intact.
- The estimate is stored only inside the private daily plan. It never rewrites a correct answer, becomes a student label, confirms a level, or changes a dynamic curve. A dedicated contract covers stable, hint-heavy, weak, and browser-spoofed evidence cases.

## 2026-08-05: Verifiable Help You Learn Bindings

- The four Help You Learn phases now have private evidence bindings in every generated Math candidate: read the context, identify the relation, calculate with the restricted rule, then check the result.
- Layered hints and guided-response steps carry the same ordered source chain. A missing, reordered, or altered binding prevents `system_validated` status, while the student still sees only the calm progressive help interface.
- This makes the support layer a verified part of the question model instead of free-standing explanatory text, preserving the same requirement for future Full-AI candidates.

## 2026-08-05: Family-Semantic Math Validation

- Every one of the 41 current Shanghai-style Grade 1-6 Math families now has a private semantic rule profile in addition to its answer, model, and derivation checks.
- A candidate must match the permitted family relation shape and ground its rule values in the visible prompt. Formula constants such as unit conversion, pi, or a required divisor are explicitly constrained; elapsed-time questions additionally bind their rule directly to the two displayed clock times.
- The shared validator is now part of the normal candidate-delivery gate. It rejects a question that is merely computable but uses the wrong relation, disconnected values, or an unbound time calculation. A 749-candidate family/grade/variant replay contract covers the layer before the wider generation suite runs.

## 2026-08-04: Durable Post-Practice Recovery

- The completed-practice summary now rebuilds from a dedicated server-derived same-run endpoint after a refresh or re-login. Students retain their light correct / wrong statistics, optional details, and the ability to start a safe server-owned wrong-question retry.
- Rebuilt detail rows deliberately contain only the delivered prompt, completion state, help usage, and safe stage label. They never rehydrate a raw answer, an answer key, a question seed, or generation metadata into the browser.
- A new contract proves that untrusted browser score claims and answers from another daily run cannot appear in the restored summary.

## 2026-08-05: Server-Owned Wrong-Retry Availability

- The post-practice summary now receives a server-derived availability state for one-click wrong-question replay. It is calculated from eligible server-scored source deliveries and previously scheduled replay sessions, not from browser memory.
- Once the eligible items have been safely scheduled, the student sees “错题已安排重做” instead of an action that would fail after a refresh or re-login.
- The endpoint returns only availability and a count. It never exposes retry-source delivery IDs, answers, seeds, or private generation records.

## 2026-08-04: Confirmed Correct-Answer Boundary

- A correct response stays correct in the permanent record. Linked later reproduction evidence can refine tomorrow's private review and challenge balance, but it never retroactively changes the student's result or changes a learning curve.
- Reproduction fragility is available only as a confidence-bounded adult support observation. The student receives a calm next-practice cue rather than labels such as unstable, guessing, or careless.

## 2026-08-03: Honest Knowledge-Map Evidence

- The atlas now keeps controlled number changes separate from reading-form transfer. A student who can solve the same relationship after one or two numbers change receives a meaningful stability record, but is not described as having transferred the skill to a genuinely different question expression.
- The short map timeline gives priority to the newest meaningful evidence: it can now say either that the relationship held when numbers changed, or that the relationship carried into a different reading form. The same shared policy is used by formal tests and reports.

## 2026-08-03: Unified Variant Evidence Policy

- Controlled one-number and two-number changes are now explicitly scored as stability evidence, while new scene, relationship wording, and question order are scored as reading-form transfer evidence.
- The same policy now drives initial assessment probes, working ability evidence, daily matching inputs, formal-test scoring, dynamic-curve evidence, whole-level confirmation, and adult formal-test reporting.
- A dedicated contract proves that a student can be stable when numbers change while still needing support when the same relationship is expressed differently; the system no longer merges those signals.

## 2026-08-03: Server-Owned Formal-Test Routing

- Formal-stage-test target grade, transfer rotation index, and curve-week anchor are now derived from the confirmed learning plan and the actual completed-learning dates.
- The browser may request a test but cannot point it at an easier grade, skip the intended transfer rotation, or shift the curve anchor by sending altered parameters.

## 2026-08-03: Clean New-Student Onboarding Baseline

- A newly created student now enters with only their own account identity and any saved grade label. The student and observer runtimes no longer substitute the demo student's birthday, device, routine, or learning evidence.
- Missing start-context fields are visibly marked for completion and use required standard dropdowns. Parent / teacher prefill still takes precedence when it exists, while the intentional offline demo continues to use its seeded data.
- Authenticated student sessions now resolve today's real local date before requesting a daily plan or run. The fixed date remains only in the deterministic demo path.
- Authenticated onboarding and learning-goal saves are now server-authoritative: a network failure leaves the draft unsaved and visible for retry instead of presenting a browser-local record as a completed account update. Browser storage remains available only for the intentional offline prototype.
- Static-curve confirmation now waits for its saved plan before advancing into practice. Initial personality / ability tests and delivered practice questions use the same boundary: a signed-in student sees a clear retry state if the server is unavailable, while only the offline demo may use bounded local scoring.
- The student surface remains hidden until identity and initial learning state resolve, so a newly signed-in student never briefly sees the demo student's name, goal, or learning evidence.
- A signed-in browser can no longer write its own daily completion record to the backend. Only a completed server-owned daily run may create the formal learning-day record that affects cadence, reports, and later matching.
- A formal stage test now starts only when the backend cadence permits it: after a configured suggestion, a parent / teacher request, or the protected mandatory interval. A skipped suggestion is saved on the backend, and the student sees a retry message if that save cannot be completed.
- Parent and teacher can now configure a bounded formal-test cadence: when to offer a gentle test invitation and the latest point at which a formal test is required. The configuration is saved with adult role provenance; daily practice still never changes the curve by itself.

## 2026-08-01: Server-Owned Guided Responses

- Guided mode now asks the student to record each of the four validated thinking phases before the next phase can open: read-and-translate, relationship, calculation, then final check.
- Short reasoning remains private in the delivery record. The last numeric response is compared by the server and returns only a confirmed or retry state, with no answer key exposed to the browser.
- The completed student flow can export the student's own recorded process. It remains separate from the primary question answer, so it does not bypass the normal practice progression or dynamic-curve evidence rules.
- The behavior layer summarizes only guided-step use, completion, and final-check outcomes for adult support, a bounded next-practice priority, and a small next-day review / self-check focus when evidence warrants it. It never reads the student's private step text, turns it into an answer score, or changes a curve directly.
- The student report now keeps today's required practice ahead of any future recommendation, then switches to the server-owned next-practice focus after completion. This keeps the calm student surface aligned with the same matching decision used by parent and teacher reports.

## 2026-08-01: Bounded Client Behavior Telemetry

- The behavior-event API now accepts browser activity only through a compact non-score event allowlist. Its payload is sanitized to known timing, navigation, optional-review, and help fields; arbitrary nested claims, raw answers, and browser-declared scoring fields are discarded.
- A browser cannot create an `answer_submitted` event. Correctness, answer values, and question evidence continue to originate exclusively from the server-owned delivery and scoring path.
- When a server-delivered question reveals a hint or a guided step, the question route itself now records that event. The student app adopts that event without mirroring a duplicate browser claim.
- A single learning-loop contract now covers a new student from parent-created account through confirmed onboarding, both initial assessments, server-calculated static curve, first server-owned practice run, behavior capture, and role-appropriate report access.

## 2026-08-01: Executable Bounded Item Model Specifications

- All 41 Shanghai-style Grade 1-6 Math families now create a private, versioned model specification with a family-specific core relation, named variable slots, legal variant boundaries, supported progression variants, bounded seed / answer ranges, and a four-phase step-extension limit.
- Candidate validation verifies the specification against the known family definition and verifies that its derivation chain uses the same core relation. A changed family boundary, variable slot, relation, or step range blocks delivery.
- The specification stays server-side and is included in canonical Full-AI reference binding. It gives a future provider a precise bounded contract instead of asking it to invent unrestricted questions.

## 2026-08-01: Voluntary Method-Comparison Evidence

- Opening the optional “another way to think” panel now records a bounded `solution_strategy_opened` event against the active question.
- The signal joins optional review and atlas opening as evidence of reflection / method comparison. It can refine adult support wording and the learning-support profile, but it never changes a score, a formal level judgment, or a learning curve.

## 2026-09-06: Optional Strategy Ordering

- A strategy card now opens its own verified steps and records a canonical strategy identifier only when the student deliberately expands that card.
- The server keeps that identifier only when it matches the student's real practice delivery and a strategy actually available on that item. Two different linked questions are required before the server can put that same optional method first on a later practice question. The delivery still sends the complete validated strategy set, and the signal cannot alter item difficulty, scoring, matching, task allocation, level evidence, or either learning curve.

## 2026-09-06: Home Learning-Curve Binding

- The student home now receives the actual resolved learning curve, static before formal-test calibration and dynamic after it. The persistent upper-right curve therefore renders the same server-owned path that drives the current plan, rather than a decorative empty shell.

## 2026-08-01: Verified Math Answer And Derivation Chain

- Every current Math candidate now passes through a restricted answer-rule evaluator before it can receive `system_validated` status. The evaluator independently recomputes arithmetic, percentages, ceiling operations, prescribed decimal rounding, and one-variable linear equations.
- It rejects arbitrary code, unknown identifiers, unsafe functions, division by zero, nonlinear expressions, equations without one solution, and any mismatch with the candidate's stored answer. This makes the Semi-AI item gate auditable without relying on a language model's claimed answer.
- Every visible solution step now also has a private ordered evidence binding: context template, answer rule, restricted computation, or answer check. The derivation certificate binds the family, variable slots, prompt template, answer rule, computed value, and shared help phases; a mismatch blocks delivery.
- The same answer and derivation gates are part of the future Full-AI path. Family-specific semantic validators remain the prerequisite before real-time AI can vary wording, values, or solution methods beyond the current canonical binding.

## 2026-08-01: Feature-Scoped Behavior Matching

- Every validated Math item now carries a bounded feature signature for family/domain, learning structure, operations, and numeric patterns such as zero, decimal, magnitude, or digit presence. It does not store raw variable values as a student feature.
- Server-scored answers retain only those feature keys. The daily matcher looks for repeated error concentration against the student's current baseline, then, only with medium or high evidence, chooses a legal seed that covers the feature inside the same family and instructional grade.
- Exact original-question replay remains higher priority than feature matching. The signal cannot change a learning curve, a formal level judgment, or a student-facing label.
- Parent and teacher reports reuse the existing adult support-signal surface to translate a verified pattern into one brief, non-labeling action. Raw feature keys and values remain server-side.

## 2026-08-01: Honest Semi-AI / Full-AI Source Boundary

- The working product now delivers student questions through an active bounded Semi-AI source rather than treating a UI toggle as a live AI implementation.
- The Full-AI-ready path is a server-only adapter: it requires an explicitly configured candidate provider, then applies the same item validation gate plus canonical family, grade, seed, variant, answer, support, and metadata binding.
- If that provider is absent or its candidate differs from the verified bounded item, the server refuses delivery. This prevents an unverified model response or browser-supplied content from quietly entering a learning run.
- Family-specific semantic validators are the next prerequisite before future real-time AI generation is allowed to vary wording, variables, or solution methods beyond the current canonical binding.

## 2026-08-01: Recent-Evidence Daily Matching

- Daily allocation and the adaptive support policy now respond to a bounded current-evidence window: the latest 36 server-scored answers plus relevant current-run, current-session, or current-question actions such as hints, retries, and optional review.
- This lets the next practice adapt when a student's current habits change without erasing the historical evidence used by reports, exact question replay, the knowledge atlas / graph, and required curriculum progression.
- The window is persisted as internal plan provenance, remains outside the student payload, falls back conservatively before answer evidence exists, and cannot update a dynamic learning curve.

## 2026-08-01: Engagement-Aware Task Chunking

- When the current evidence contains three or more completed visits that are repeatedly short or interruption-heavy, the adaptive support policy now starts the next practice in smaller self-contained chunks.
- This is a workload-presentation choice, not an ability or motivation label: it does not change the question level, the student's target, the static curve, or the formal-test-only dynamic curve.

## 2026-08-01: Confidence-Bounded Daily Allocation

- The question-mix rule engine now scales behavior-based ratio changes by the amount of trusted recent answer evidence: no evidence keeps defaults, 1-5 answers apply a light adjustment, 6-17 apply a partial adjustment, and 18 or more use the complete bounded rule.
- Exact wrong-question replay, layered support, and formal-test curve calibration are unchanged. This only prevents one accidental answer from making the next day's mix swing too hard.

## 2026-08-01: Observer Learning-Path View

- The parent / teacher overview now renders the persisted initial learning curve as a real upward path instead of a decorative drawing.
- After a verified formal stage test, the same view overlays the persisted dynamic curve, including paths that are ahead of, near, or behind the initial plan.
- Adults can see the confirmed goal, current week, agreed rhythm, current learning focus, expected terminal progress, and the protected rule that daily practice changes the next questions while formal tests alone calibrate the curve.
- The student surface remains deliberately simpler: it keeps progress, today’s practice, and the next step rather than exposing adult planning rationale.

## 2026-08-01: Teacher Question-Tag Evidence

- The server report now derives a compact teacher-only view from server-scored answers: question family, instructional grade, controlled variant coverage, high-level tag counts, overall accuracy, and independent completion.
- It deliberately excludes question prompts, answers, seeds, private generation inputs, and internal student labels. Parents and students do not receive the teacher-only item-pattern summary.
- The teacher report now uses this evidence in place of a generic “tagged questions” placeholder. A dedicated integration check verifies the role boundary and the absence of answer leakage.

## 2026-08-01: Scenario-Based Learning-Personality Templates

- The six learning-personality slots now have multiple equivalent student-facing scenarios, matching the existing psychological template strategy rather than repeating a fixed questionnaire for everyone.
- Template choice is deterministic for each student and slot, so an interrupted server-owned onboarding run resumes with the same question and scoring rule. Different student identities receive varied scenario wording without exceeding the combined 12-item cap.
- Each stored response retains safe template provenance. The resulting profile remains a learning-support starting point and is refined later by actual practice behavior.

## 2026-07-22: Account Creation And Student Binding

- Parents and teachers can now create a local account from the sign-in surface, then create a student's login, initial password, display name, and Grade 1-6 profile from a separate observer-side account page.
- The server creates the student identity, profile, self-access link, and parent / teacher relationship link in one transaction. The new student appears in the observer's own student picker and can sign in without inheriting observer controls.
- Login identifiers, names, passwords, grade labels, duplicate identities, and role boundaries are validated server-side. Sensitive credentials are never returned, and registration, student creation, profile changes, and password changes leave structured audit records.
- A focused contract verifies the end-to-end parent registration, automatic student binding, student self-access, unrelated-teacher denial, duplicate prevention, and audit trail.

## 2026-07-22: Role-Bound Student Relationship Codes

- A linked parent or teacher can now generate a one-time, seven-day relationship code for an additional parent or teacher. The code is stored only as a hash and carries the intended role, never a raw student identifier.
- A signed-in adult can accept only a code matching their own role. On acceptance the server adds their access link transactionally, marks the code used, and records the event; students and unlinked observers cannot create arbitrary relationships.
- A focused contract verifies anonymous and student denial, role mismatch, unlinked-observer denial, successful teacher binding, one-time use, observer read access, and both sides of the audit trail.

## 2026-07-22: Identity-Scoped Student Runtime

- Student bootstrap now reads the authenticated student's own server profile before importing the learning runtime. The runtime replaces the prototype identity with the account's student id, display name, and saved Grade 1-6 label before any plan, assessment, report, or practice repository is addressed.
- New students begin with an empty evidence history rather than inheriting the demo student's behavior events, parent / teacher message, or ability evidence. Direct file-based prototype review continues to retain the demo seed intentionally.
- A complete isolated new-student contract now verifies account creation, individual profile scope, basic-information confirmation, personality assessment, initial math assessment, first server-owned learning curve, and first daily plan without any reference to the demo student.

## 2026-07-22: Account And Session Contract

- Account profile updates, password changes, session lookup, session revocation, sign-out, and bounded failed-login protection now have one isolated service contract.
- Account responses are explicitly non-cacheable and carry a content-type protection header. Display names reject control characters before persistence, while the local development cookie remains `HttpOnly` and `SameSite=Lax`.
- A successful password change preserves the active device, revokes the other active sessions, and requires the new password for every subsequent sign-in.

## 2026-07-22: Evidence-Bounded Adult Guidance

- Parent and teacher reports now turn trusted learning evidence into at most three role-specific next actions: the next learning focus, a rhythm repair when needed, and one behavior-aware support move.
- The guide deliberately waits for a small evidence sample, avoids fixed student labels, and keeps the adult recommendation separate from student-facing report copy.
- It uses only server report inputs and cannot change the learning curve; a new contract verifies collecting, rapid-response, hint-heavy, rhythm, and role-boundary cases.

## 2026-07-22: Broader Grade-Aware Math Logic Library

- The executable Shanghai-style G1-G6 library now contains 41 bounded item families across the agreed eight curriculum domains. The latest expansion adds regrouping addition/subtraction, multiplication-division inverse relations, operation order, unlike-denominator fraction comparison, decimal rounding, circle circumference, trapezoid area, and map scale applications on top of the prior broad library.
- Each addition has its own variable boundary, original / one-number / two-number controls, validated numeric answer, help sequence, guided steps, curriculum tags, and shared knowledge-graph binding.
- The library contract now validates 1,712 generated candidates across family, grade, seed, and variant combinations before a delivery can be considered system-valid.
- Existing learners keep their versioned core-route placement when the library grows. Newly validated families are available to the graph and assessments, then enter the new-plan route only after explicit curriculum sequencing review.

## 2026-07-22: Versioned Curriculum Route

- Added `math-learning-path-v4` for newly confirmed student plans. It places all 41 validated families in reviewed Grade 1-6 routes, preserving prerequisite order across number sense, operations, data, geometry, fractions, decimals, ratios, scale, and applications.
- Existing plans retain their stored `math-learning-path-v2` or `math-learning-path-v3` route version, so a later library expansion never shifts a student’s already-confirmed curve placement.
- New-plan, daily-plan, and new-student onboarding contracts now verify the V4 route; the learning-path contract separately verifies historic V2 and V3 placement remains intact.

## 2026-07-22: Bounded API Request Handling

- API JSON bodies now reject malformed or non-object payloads with a safe `400` response and enforce a two-megabyte upper bound that still accommodates the permitted local avatar image payload.
- Unhandled request errors no longer echo internal exception details to the browser. An isolated contract covers malformed, array, oversized, and valid request paths.

## 2026-07-21: Enforced Formal-Test Gate

- Once the protected mandatory practice interval is reached, the server now rejects creation of a new daily-practice plan or run until a formal stage test is completed. The rejection returns only safe cadence state so the student page can open the existing test surface.
- An existing in-progress run remains resumable and finishable. Voluntary new practice is also held until calibration, so the daily queue cannot quietly move forward on stale formal evidence.
- The client preserves this protected response instead of falling back to a browser-local queue. The stage-test surface receives the server’s mandatory state, while daily practice still never changes the dynamic curve by itself.
- A verified test now checkpoints against the most recent server-recorded completed learning day, so the next cadence starts from real evidence rather than an older static-plan date.
- The prior-attempt replay flow remains in place: one unresolved original can return exactly before its one-number and two-number variations, with an optional student-only view of the prior prompt and their own answer.

## 2026-07-21: Target-Scoped Level Evidence

- Formal level evidence now keeps G1-G6 targets separate: a verified test from one target level cannot make a different target level appear reached.
- A whole-level decision now requires tagged core knowledge-node coverage and mastery in addition to curriculum-family coverage, direct prerequisites, controlled variants, transfer, and verified test performance.
- Parents and teachers see a compact family / knowledge-node / prerequisite progress summary. Students continue to see only their learning path, not internal certification criteria.

## 2026-07-21: Observer-Confirmed Collaboration

- In an authenticated observer session, a parent or teacher now receives a saved confirmation only after the server accepts a student message or personal observer-page setting.
- A failed protected save reverts the observer-page change instead of leaving a misleading local success state. Offline prototype review still keeps its browser-local fallback.
- Added coverage for observer identity binding: a parent or teacher cannot write a workspace or message under another observer identity, and students remain read-only for observer messages.

## 2026-07-21: Confirmed Student Personal Space

- Student avatar, nickname, page style, and reading-density changes now remain in a local draft until the signed-in server accepts them. A rejected save preserves the draft for retry rather than overwriting the active student space.
- The preference endpoint now validates bounded display names, supported style / density values, and image-only avatar data before SQLite persistence. Offline prototype review still keeps a local fallback.

## 2026-07-14: Authenticated Learning-Space Entry

- Student and observer applications now wait for a valid local session before importing their protected runtime. This prevents an unauthenticated page from silently switching to browser-only sample data when its server calls are denied.
- Student and admin accounts enter the learning space; parent and teacher accounts enter the observer space. A safe internal return path preserves the intended destination after sign-in without permitting external redirects.
- Direct file review remains available when no local API exists, while the local development server enforces the signed-in application flow.

## 2026-07-14: Server-Owned Initial Learning Plan

- Static-curve confirmation now creates the first student plan on the server, not from a browser-supplied curve. It derives the ability snapshot from the completed initial assessment, normalizes the selected G1-G6 goal and study rhythm, and calculates the same bounded upward curve used by later daily matching.
- The confirmation records a student-authorized goal draft, the assessment summary, adaptive support seed, task cadence, and test cadence. Unfeasible curve inputs are rejected until the target or rhythm is adjusted.
- A confirmed plan is marked server-authoritative. Generic client plan writes no longer overwrite it, and the daily matching engine can immediately use it as its protected starting source.
- Added an isolated contract covering authentication, initial-test gating, parent write denial, server-generated curve evidence, idempotency, first daily-plan resolution, and client-overwrite denial.

## 2026-07-14: Server-Owned Personality And Learning-Style Test

- The two onboarding personality layers now run as one protected, scenario-template assessment with a hard twelve-question cap. The server keeps the option-score mapping, order, and response validation; the page receives only the question currently needed and a light learning-support view.
- Confirmed basic information and math selection are required before the run begins. Parent and teacher accounts can read a linked student's result but cannot answer, restart, reorder, or alter the run.
- The initial learning-plan service now reuses the exact saved template snapshot when it derives the first adaptive support seed, avoiding a later library change silently changing an earlier student's onboarding interpretation.
- Added a contract for authentication, prerequisite gating, answer bounds, question ordering, read/write role boundaries, twelve-item cap, idempotent re-entry, and private-score non-disclosure.

## 2026-07-14: Server-Owned Required Daily Progression

- Added a persistent daily-practice run on top of the stable daily matching plan. The run owns the private queue seeds, active delivery, and current required progression step.
- Required practice now advances only in the agreed sequence: original question, one-number change, then two-number change. A wrong answer remains on the active original / variant; only a correct server-scored answer releases the next step.
- The browser adopts only the delivery attached to the current server run. It cannot advance from a direct, stale, or manually requested later-stage delivery, and reload restores the server run before a saved browser position.
- Removed private queue seeds from the public daily-plan response. Required-practice screens now build safe placeholders from queue identity / family / grade and wait for the server's current delivery, so the browser cannot reproduce answers from a local seed.
- Added and verified contracts for plan gating, stable delivery reuse, wrong-answer blocking, direct-delivery isolation, one-step release, duplicate-answer rejection, parent read-only access, and non-disclosure of private seeds / answers.

## 2026-07-14: Server-Evidence Learning Reports

- Added an access-controlled, subject-scoped report snapshot for students, parents, and teachers. It joins trusted answer events, activity rhythm, learning-plan curve state, initial assessment, and formal stage-test history without exposing answers or private question structures.
- Correctness, response time, hint use, retry success, and variant-transfer metrics now count only server-scored answer events. Legacy or browser-claimed answer events are retained for compatibility but excluded from those key report metrics.
- Student and observer surfaces hydrate the same server report foundation, then retain their different levels of detail and language.
- Added an isolated report contract covering anonymous denial, parent read access, subject isolation, untrusted-answer exclusion, learning-time aggregation, safe test/curve summaries, and no answer leakage.

## 2026-07-14: Server-Owned Daily Matching Plan

- Added one persisted server-owned daily matching plan per student, subject, and date. It combines the confirmed learning curve, current instructional grade, behavior evidence, support policy, bounded allocation engine, and validated math families.
- Homepage, calendar, curve, and practice entrances now resolve the same queue in signed-in runs rather than creating a new local selection for each entry.
- The server returns only a safe queue presentation; allocation ratios and behavior analysis remain backend evidence. Practice-session persistence now strips raw answers, detailed solution steps, and unopened support structures.
- Every server-scored practice attempt now emits a trusted answer event with server-started timing and server-recorded hint depth; direct browser answer-result events are rejected.
- Added contracts that verify confirmed-curve gating, stable same-day reuse, grade-bounded delivery, private allocation evidence, parent read-only access, trusted scoring events, and no answer leakage.

## 2026-07-14: Server-Authoritative Question Delivery

- Added a SQLite-backed question-delivery record that binds a generated math item to one student, subject, mode, family, instructional grade, seed, and controlled variant.
- The local API now creates a safe student presentation, scores submitted answers on the server, and returns one hint or one guided step at a time only for practice mode. Formal-assessment deliveries reject support requests.
- Daily practice adopts the delivery route when a signed-in local session is available. Formal stage tests now also assemble, serve, accept one response at a time, score, persist, and update the dynamic curve wholly on the server; behavior events no longer carry the correct answer.
- Initial math ability testing now also has a server-owned run: it exposes only safe prompts and metadata, records answers and timing on the server, preserves fuzzy sequential flow, and returns only scored ability signals to build the ability map.
- Verified isolated contracts for answer non-disclosure, server scoring, parent write denial, layered practice support, no-help formal assessment, initial-test and stage-question order, and server-owned dynamic-curve updates.

## 2026-07-14: Broad Grade-Aware Math Logic Library

- Expanded the executable Shanghai-style G1-G6 math catalog from 11 to 21 bounded item families, adding early time and money, operation structure, decimal contexts, multi-step application, angle, volume, distance-speed-time, probability, and coordinate movement coverage. Later expansion is recorded above.
- Added grade-aware generation: the same family now resolves an allowed instructional grade and narrows its seed / number range for earlier grades. The resolved grade persists in the system-level, difficulty, and generation tag groups.
- Connected the grade context through initial assessment, daily queue, optional practice, and cross-family stage assessment so all routes still call the same validated generator. Daily selection is constrained by the learner's current instructional grade, not simply their long-term target.
- Added a durable math-library contract that checks all eight domains, grade coverage, every family / grade / variant combination, grade-boundary tags, and G1-G6 initial / stage assembly. It now validates 1,152 generated candidates in one run.

## 2026-07-14: Adaptive Support Profile From Practice Behavior

- Added a versioned adaptive support engine that combines the onboarding personality / learning-style seed with later answers, hint use, retries, review choices, voluntary practice, variant performance, and within-session fatigue.
- The engine waits for a meaningful sample before changing the seed. Its output remains action-oriented: hint entry, feedback wording, task chunking, and challenge pacing, not personality or risk labels for students.
- The current support policy now persists with the student plan and flows into next-day allocation and queue metadata. Student practice uses the policy for its hint cue and error-recovery language; observer views receive a concise support update.
- Verified sparse, independent, and higher-support/fatigue scenarios together with queue propagation. The engine cannot update a dynamic curve.

## 2026-07-14: Multi-Entrance Stage-Test Invitations

- Connected the same stage-test surface to the student home / learning-curve reminder, daily-practice completion summary, and report next step, while preserving the existing test-module entry and initial onboarding entry.
- Added an authorized parent / teacher action that creates one calm, skip-eligible test invitation for a linked student's confirmed math plan. The student never sees who requested it and the request cannot directly change a curve.
- Invitation status persists in the plan's assessment-cadence record, is acknowledged on skip or verified completion, and yields to the protected mandatory-test window.
- Added and verified an isolated API and cadence contract for parent request, student readback, optional invitation behavior, acknowledgement, and mandatory-window override.

## 2026-07-14: Parent/Teacher Goal Proposal And Student Confirmation

- Added one shared goal-and-rhythm handoff: a linked parent or teacher can propose a bounded G1-G6 target, learning period, daily minutes, and weekly frequency from the observer page.
- After the student completes the initial math test, the student sees the proposal, can adjust it, and confirms it together with the first static curve. The plan then becomes the active source of truth.
- Added an authorized API and SQLite record for the draft. Parent/teacher edits are rejected once the initial curve is confirmed; later rhythm changes remain in the separate test-calibrated dynamic-curve flow.
- Verified the complete parent-propose, student-confirm, parent-readback contract against an isolated local database.

## 2026-07-14: Cross-Family Stage Assessment

- Replaced the single-family stage-test generator with a rotating G1-G6 formal-test assembly service.
- Every test now samples several target-level families, direct prerequisites where available, controlled one-number/two-number variants, and a new-context transfer item, all from the shared validated item models.
- The session retains its assessment blueprint and each scored response retains its evidence role, so later level decisions can accumulate genuine coverage instead of treating one narrow test as a whole-grade result.
- Verified G1-G6 assembly breadth, item validation, rotation, and the complete verified-result scoring path locally.

## 2026-07-14: Parent/Teacher Onboarding Prefill

- Added a focused observer setting for parents and teachers to prefill a student's birthday, school context, routine, attention band, reading comfort, device, curriculum, and MVP math selection using only standard options.
- The student onboarding page now receives the same record, clearly marks an adult prefill, and lets the student either confirm it or open the same standardized controls to adjust it before testing.
- Added a role-authorized API and SQLite record for the handoff. The record preserves the original adult source, the latest editor, and the student-confirmation state; browser storage remains an offline fallback for direct prototype review.
- Verified the parent-save, student-adjust, and student-confirm API contract against an isolated local database.

## 2026-07-14: Grade-Routed Initial Math Assessment

- The initial math test now derives its route from the student's confirmed standard grade selection, covering the current Shanghai-style G1-G6 logic-family catalog instead of serving a one-size-fits-all set.
- It samples current-grade families first, then directly adjacent prerequisites only when additional coverage is useful. Default initial testing does not pull in advanced-grade stretch questions.
- When a young grade has a small number of available logic families, the system verifies the same mathematical structure in a different real-world context rather than adding an age-inappropriate topic.
- Verified locally across G1-G6: every generated item is validated, correctly tagged with its grade-routing role, stays within the eight-question ceiling, and includes no default stretch item.

## 2026-07-14: Student Assessment Runtime Boundary

- Reworked the student-facing initial math test into a one-question-at-a-time flow with a continuous fuzzy progress bar. It no longer shows an exact question index, total count, or backend validation message.
- Removed the question-logic-library preview from the student test page. The frontend receives only the assigned question; generation rules and tags remain an internal system capability.

## 2026-07-14: Test-Only Level Attainment Engine

- Added a versioned G1-G6 math level-definition engine derived from the Shanghai-style logic-family catalog.
- Verified stage tests now retain an attainment decision alongside their curve-calibration result. It checks core-family coverage, direct prerequisite evidence, controlled original/one-number/two-number stability, transfer evidence, and threshold performance.
- A focused formal test can still calibrate the dynamic curve, but it cannot falsely claim that the student has reached an entire grade-level target until cumulative verified evidence is broad enough.
- Verified locally with both a focused-test guardrail contract and a full cross-family attainment contract.
- Parent and teacher now see the compact evidence state inside their existing goal-progress explanation; student pages remain free of internal attainment criteria.

## 2026-07-14: Logic-Driven Personality Onboarding

- Replaced static personality examples with a six-item psychological layer and six-item learning-personality layer generated from stable scenario-template logic, staying within the confirmed twelve-item cap.
- Each response preserves its template and logic-library provenance, forms an initial multi-dimensional learning-support view, and updates the initial support profile used by hint depth and task chunking.
- The student sees one question at a time with fuzzy progress and no exact test count. Learning-personality questions unlock after the psychological layer; math ability testing unlocks after both layers.
- Removed the old hard-coded personality result previews so the interface no longer presents simulated personality outcomes as real student data.
- Parent and teacher observer views now reconstruct the same stored initial support profile and show only a compact set of usable support cues.

## 2026-07-14: Interactive Goal, Rhythm, And Static-Curve Draft

- Added standardized math-goal and learning-rhythm option catalogs for G1-G6 targets, total learning period, daily study minutes, and weekly study frequency.
- The student flow now unlocks those inputs only after the initial psychological, learning-personality, and math ability evidence is complete.
- A change immediately regenerates the upward static-curve draft, without silently rewriting an already confirmed daily task or plan. The selected target/rhythm are persisted together only when the student confirms the static curve.

## 2026-07-14: Feasibility-Bounded Static Curve

- Replaced the placeholder straight-to-target static curve with a cohort-baseline calculation using current ability, selected grade target, total planned learning minutes, weekly cadence, and a versioned growth shape.
- A curve can now end below the target when the selected rhythm is genuinely too light; the student sees a calm feasibility cue and a suggested duration instead of a misleading guaranteed finish.
- The existing test-only boundary remains unchanged: daily practice can refine tomorrow's questions, while verified stage tests alone update the dynamic curve.

## 2026-07-14: Enforced Onboarding Order

- The onboarding flow now unlocks only the next valid step: student-confirmed basics, psychological support, learning support, selected math subject, initial ability test, ability map, target, rhythm, then static-curve confirmation.
- Future steps cannot be opened by clicking ahead, and a curve that is not yet feasible cannot silently become the basis for daily tasks.

## 2026-07-14: Standard-Option Data Contract Repair

- Unified parent, teacher, and student basic-information dropdowns around catalog option IDs; birthday fields remain numeric by design.
- Added backward-compatible normalization for previously stored catalog values, so legacy prefill data is converted to canonical IDs before assessment routing or completion checks.

## 2026-07-13: Parent and Teacher Observer Workspace

- Added a separate observer surface at `observer.html`, keeping the student navigation unchanged.
- Parent and teacher now each have an independent configurable view for progress, behavior, ability evidence, curve status, knowledge-map coverage, and messages.
- Added local API/database records for observer workspace configuration and student messages.
- Student boundaries remain intact: raw profile signals and algorithm traces are not shown in the student interface.

## 2026-07-13: Student Personal Space and Test History

- Added a light student personal entry: avatar upload, nickname, warm/focus/bright page style, and reading-density preference.
- Student preferences now persist through browser storage and the local SQLite/API layer.
- Parent / teacher messages now appear as a single supportive, student-facing home-page message rather than internal analysis.
- Added student report test history: the initial assessment establishes the baseline and verified stage tests append mastery, transfer, and curve-calibration evidence.

## 2026-07-13: Account and Session Foundation

- Added local user-account and authentication-session tables for student, parent, and teacher roles.
- Passwords are stored only as `scrypt` hashes; local sessions use random server-side tokens, stored only as token hashes and delivered in `HttpOnly` same-site cookies.
- Added sign-in, sign-out, and current-session API routes with a bounded local failed-login rate limit.
- Added a dedicated sign-in page and role-based destination routing. Current direct page entry remains available for prototype review; protected API access now requires the authenticated role and an active student link.

## 2026-07-14: API Role Authorization

- Added session-backed authorization to every student-data API route. Unauthenticated access is rejected rather than relying on the client interface alone.
- A student can read and update only their own learning records; linked parents and teachers can read the relevant student's learning evidence, but cannot alter the student's plan, practice records, assessments, or personal settings.
- Observer workspace settings are tied to the signed-in parent or teacher. Student messages are additionally tied to the sender's authenticated account and role, preventing sender impersonation.
- Verified locally: anonymous plan access returns `401`, a signed-in student can read their own plan, a signed-in parent has read access but cannot write student preferences, and a parent cannot submit a message as a teacher.

## 2026-07-14: Multi-Student Access Foundation

- Added an explicit parent / teacher / student-to-student access-link table rather than relying on a single student ID stored on an account.
- Authorization now resolves access through these active links, so a parent or teacher can later be linked to multiple students without changing the data-access policy.
- Added a signed-in `linked-students` API contract for the observer interface. The present local demo correctly returns only the linked student for the demo parent.

## 2026-07-14: Linked Student Switching

- Connected the parent / teacher observer surface to the linked-student API. A signed-in observer now sees only their own linked students and can switch between them without entering a different account.
- Each switch resets and reloads the selected student's plan, assessment evidence, behavior events, messages, and observer layout. A request-version guard prevents an earlier asynchronous load from overwriting a newer selection.
- If an account has no active student links, the observer shows a calm binding-empty state rather than any demo learning data. Direct prototype review continues to use the single local example student.

## 2026-07-14: Confirmed Dynamic-Curve Adjustments

- Added a parent / teacher learning-rhythm control in the observer report: review a proposed rhythm first, then explicitly confirm it.
- Added the matching student result-page flow: after a verified stage test, students can preview a bounded period, daily time, weekly frequency, and curve direction, see the resulting upward curve, then explicitly confirm it.
- The server validates the available duration, daily time, weekly frequency, test interval, and curve-direction options; it recomputes the curve server-side rather than trusting a browser calculation.
- A confirmed adjustment requires an existing verified dynamic curve from a formal test. It preserves today's assigned task, clears only the next task handoff, and applies the new curve from the next learning day.
- Verified with isolated local data that both a student and a parent can confirm a valid adjustment; the plan stores the adjusted dynamic curve, actor trail, and next-learning-day boundary. The stage-test regression contract also remains green.
- The student default now retains the higher terminal implied by verified test evidence, while the original-goal option calculates an earlier arrival week and visually reaches that original goal without silently changing it.
- The API independently enforces the role boundary: students can use only the two simple modes and cannot alter the adult-owned test interval; parents and teachers retain the fuller bounded adjustment controls.
- When verified progress is temporarily below plan, the same result page now changes to supportive language: stabilize the foundation or allow more time. The server rejects a higher-target choice in that direction, and the curve reports the longer expected arrival rather than pretending the original deadline still holds.

## 2026-07-20: Privacy-Safe Peer Reference

- Replaced the report's fixed peer-percentile mock with a server-computed, anonymous same-target reference band.
- A reference appears only after a minimum cohort with trusted server-scored evidence exists; otherwise student and observer reports plainly show that the reference is still calibrating.
- The returned report contains no peer identities, answers, raw traces, or pressure-oriented rank. Student copy stays gentle, while observer copy explains the evidence boundary.
- The practice-completion page now applies the same privacy boundary to same-question-family correctness. It uses a real anonymous aggregate when enough peers exist and otherwise simply says the reference is being established.

## 2026-07-20: Evidence-Aware Daily Retry Routing

- Tightened the private daily queue so a historical wrong answer no longer follows a learner after a later no-hint success on that same question family.
- A correct answer that depended on hints stays eligible for an independent retry, while a new wrong answer reopens the retry route. This preserves the agreed pattern: retry the original logic independently before moving on.
- Added a focused contract covering resolved, newly unresolved, hint-supported, and correct-review family routing.

## 2026-07-20: Universal Help-You-Learn Scaffold

- Every validated Math item now owns the same protected four-phase support path: read-and-translate, relationship, calculation, and check.
- The first released hint is always a non-answer-bearing “read and translate” cue; guided mode follows the same phase order and keeps expected answers on the server.
- Item validation now rejects a candidate without the complete support framework, so future AI-generated candidates must satisfy the same decomposition boundary before delivery.

## 2026-07-14: Confidence-Bounded Behavior Signals

- Added a behavior-analysis engine that turns answer timing, hint depth, retry outcomes, linked original-to-one-number-to-two-number reproduction, variant transfer, voluntary practice, and within-session fatigue into bounded evidence.
- The engine distinguishes low, medium, and high confidence so a small number of answers cannot produce a strong behavioral conclusion.
- Its allocation inputs now guide only the next learning day's question mix. It does not alter the verified dynamic curve and it does not expose raw or negative labels to students.
- Adult reports can surface a single actionable support observation when enough evidence exists; otherwise the system keeps collecting behavior quietly.
- Server-scored answers now immediately refresh the stored support profile from its onboarding baseline. The next daily queue receives the updated hint-entry, task-chunking, and challenge-pacing policy, while an already-started practice run remains stable.

## 2026-07-14: Account and Security Surface

- Added a separate `Account and Security` surface outside the student learning navigation, with account display-name updates, password changes, and sign-out.
- Password changes require the current password, enforce a length and character policy, and revoke other active sessions while preserving the current session.
- Added the corresponding authenticated profile and password APIs. Verified the full isolated endpoint contract, including the other-session revocation behavior.

## 2026-07-14: Student Roster and Relationship Records

- Added a distinct student-profile record with student identity, display name, grade label, active subject scope, and status, separate from the login account.
- Parent, teacher, and student links now resolve against that roster. The linked-student response includes the student name and grade rather than only an internal ID.
- Added an authorized student-profile API and connected the observer view to use the server profile when a signed-in role is present, while retaining direct-review fallback for the prototype.

## 2026-07-14: Daily Cadence and Gentle Recovery

- Added a date-scoped cadence engine that reads completed daily-practice sessions against the family's agreed weekly study frequency.
- One missed study day creates one calm recovery entry for the student; completing it explicitly closes the missed record instead of leaving it behind.
- Repeated misses never accumulate into a backlog. Only the parent / teacher observer view receives a gentle check-in after a pattern appears, followed by a rhythm-review suggestion for a sustained pattern.
- Added a compact, non-numeric cadence strip to the student home page and durable local/API history retrieval for prior practice sessions.
- Required-practice completion is now recorded directly by the server-owned run, so a finished day remains reliable even if the browser closes before its local session mirror returns.

## 2026-07-14: Assessment Cadence and Formal-Test Gate

- Added an assessment-cadence engine that counts completed practice days since the latest verified stage-test evidence.
- The student receives a simple suggestion after the configured threshold, may skip one suggestion, and is required to take a formal stage test at the protected window. Practice never updates the dynamic curve directly.
- Parent and teacher observer settings can configure both the suggested-test interval and the latest required-test window through a narrowly authorized API. The server validates a bounded gap between them; only those cadence settings are writable from the observer role.
- A completed stage test now records the latest practice date it covers, clearing the cadence cycle before any future invitation can be considered.

## 2026-07-14: Evidence-Driven Knowledge Map

- Replaced the homepage knowledge-map mock progress with a shared evidence engine fed by initial ability-test answers and tagged practice events.
- The map distinguishes unexplored, in-progress, and independently completed nodes; original, one-number, and two-number variants contribute evidence at different strengths.
- Student home keeps the result visual and compact. The optional atlas now shows a personal timeline plus real review, independent-completion, and variant-breakthrough examples.
- Parent and teacher observer views use the same computed map rather than a separate static percentage. The map remains an evidence view only; it cannot update the dynamic curve.

## 2026-07-14: Knowledge-Point Review Archive

- Added a durable wrong-item archive to the optional knowledge atlas. Each real wrong answer retains the question context, student answer, verified correct answer, question-focus tags, retry state, and next action.

## 2026-07-14: Behavior-Derived Learning Reports

- Replaced report behavior metrics with a shared event-derived engine: real study time, session range, independent and post-hint accuracy, hint use, retry success, variant performance, and voluntary practice.
- Added a runtime ability-evidence map that combines initial assessment responses with tagged practice answers. It is reused by student and observer reports instead of relying on a static sample ability map.
- Ability trend now compares actual baseline evidence with current evidence. It no longer invents a prior score merely to draw an upward bar.
- Daily behavior can refine the working ability view and next-question logic, but cannot change the dynamic curve; only verified formal tests can do that.
- A later correct response to the same original question closes the review item as a successful retry instead of leaving a permanent error record.
- Verified the full student flow in the browser: wrong answer -> atlas archive -> original-question retry -> archive changes to `已重做成功`.

## 2026-07-14: Engagement Session Evidence

- Added application-session tracking for entry time, visibility pauses, resumes, and active duration. This records real system visits instead of estimating them only from answer timestamps.
- Observer behavior summaries can now distinguish practice sessions from system visits and show a habitual-entry signal only after enough visits exist. The data remains bounded support evidence and cannot update the dynamic curve.

## Sprint 0 Foundation

Status: in progress.

Completed:

- 20-page route map created in `src/data/route-map.js`.
- App state layer created in `src/core/app-state.js`.
- Semi-AI / Full-AI question source boundary created in `src/services/question-source.js`.
- Static learning curve engine created in `src/services/learning-curve-engine.js`.
- Generated ability map engine created in `src/services/ability-map-engine.js`.
- Daily question allocation engine created in `src/services/daily-allocation-engine.js`.
- Account / role foundation records and account context service created.
- Role-based report configuration records and summary service created.
- Semi-AI / Full-AI-ready math item generator created behind the same validation gate.
- Math item generator now covers all 11 Grade 1-6 item families in the current Shanghai-style taxonomy.
- Initial ability test assembly now pulls generated, validated questions from the same math logic library.
- Parent / teacher report configuration runtime now supports role switching and module toggles.
- Parent / teacher learning-parameter runtime now creates curve proposals from editable duration, daily minutes, weekly days, test interval, and curve mode.
- Confirmed learning-parameter proposals now create a separate, traceable confirmation record instead of silently changing the confirmed curve.
- Initial psychological, learning-personality, and subject-ability answers now have a response-recording path rather than existing only as static preview content.
- Recorded subject-ability answers now feed the ability-map engine, static curve, and daily question allocation. Learning-personality answers only tune support depth.
- Every current Grade 1-6 math item family now has three bounded real-world context templates, all passing the same answer, metadata, step, and hint validation.
- Every current math family now carries explicit seed and answer boundaries; the generator normalizes inputs and rejects candidates outside those bounds.
- Original, one-number, and two-number variants now use the same base seed and record zero, one, or two controlled independent-condition changes respectively; derived values are recalculated so each variant remains solvable.
- Every current math family can now also produce a same-structure, new-context variant: the numbers and answer remain fixed while the real-world wording changes under the same validation gate.
- Confirmed learning-parameter proposals and confirmed static curves now write to a durable browser-side student-plan record, ready to be replaced by a cloud plan table later.
- Initial assessment answers now persist in a browser-side assessment session and are restored into the initial ability calculation on reload.
- Parent / teacher observer preview now uses shared plan, assessment, and ability data while keeping those controls outside the student main navigation.
- Practice behavior events now persist locally by student and restore into reports; per-session duration only uses events from the current visit.
- Practice behavior now generates a separate next-practice allocation proposal; it updates tomorrow's question mix without changing today's task or the dynamic curve.
- Shanghai Grade 1-6 math taxonomy created in `src/data/shanghai-math-taxonomy.js`.
- Math logic helpers created in `src/modules/math-question-logic.js`.
- Main app now renders a backend math logic panel inside the test flow.
- Semi-AI / Full-AI toggle changes the question source contract in the app.
- Onboarding flow state machine renders in the test flow and can advance through entry steps.
- Static curve confirmation routes the student into the practice page.
- Home page now shows backend daily question allocation as a concise student-facing hint.
- Report page now reads live practice behavior metrics: total time, hint use, independent correctness, redo success, ability trend, and peer trend.
- User / parent / teacher bindings render in the backend foundation panel without adding a student main-nav page.
- Student / parent / teacher report configuration boundaries render in the backend foundation panel.
- Backend foundation panel now shows both generator tracks passing the same delivery validation.
- Practice runtime now receives validated generated candidates, then advances from original question to one-number and two-number variants.
- Help-you-learn support now includes previous-attempt recall, multi-strategy explanation, and guided step-by-step mode.
- Route review panel created from the 20-page MVP route map so development order stays visible.

Verified:

- Main app opens at `index.html?v=system-foundation-1`.
- Main app opens at `index.html?v=system-runtime-3`.
- Student main nav remains `首页 / 测试 / 练习 / 报告`.
- System foundation panel renders G1-G6 coverage.
- Full-AI toggle switches source to `ai_candidate_validated`.
- Generated static curve creates a daily task reference.
- Browser verification confirms curve confirmation opens the practice view.
- Browser verification confirms home allocation, account foundation, report behavior metrics, and answer-to-report updates with no console errors.
- Node verification confirms both generator tracks produce 5/5 validated sample candidates.
- Node verification confirms both generator tracks produce 11/11 validated family candidates.
- Browser verification confirms validated generated math questions advance through original, one-number variant, and two-number variant.
- Browser verification confirms previous-attempt recall stays folded by default and guided mode opens step by step.
- Browser verification confirms the test page shows all 20 route-review entries grouped by stage.
- Browser verification confirms the backend foundation panel shows 11/11 validated candidates for both Semi-AI and Full-AI-ready.
- Browser verification confirms the initial ability test renders 8 generated, validated questions.
- Browser verification confirms parent / teacher report config can switch roles and toggle modules without errors.
- Browser verification confirms learning-parameter changes update the curve proposal without directly overwriting the confirmed curve.
- Browser verification confirms a curve proposal can be confirmed into a parent-owned record without console errors.
- Browser verification confirms personality choices and a generated math-test answer can be recorded and retained in the test interface without console errors.
- Browser verification confirms a recorded correct generated math answer recalculates the ability start from 58% to 64% and target readiness from 48% to 57%.
- Browser verification confirms an initial-test answer, its 64% recalculated ability map, and the test-response count all restore after a page reload with no console errors.
- Browser verification confirms parent and teacher observer previews read the same restored 64% ability map and 1 recorded test response, while changing their role-specific focus copy.
- Browser verification confirms a hint-opening behavior event survives page reload; the restored report count grows from 5 to 7 when the new visit starts, with no console errors.
- Browser verification confirms a wrong answer updates tomorrow's mix to 50% wrong-item retry while the visible learning curve remains 64%; that mix restores after reload with no console errors.
- Node verification confirms 33 generated candidates across 11 item families and 3 context templates all pass validation.
- Node verification confirms 297 candidates across positive/negative seed inputs and all three practice variants pass the generation boundary checks.
- Node verification confirms those 297 candidates also have distinct prompts and the expected 0 / 1 / 2 controlled-change metadata for their practice variant.
- Node verification confirms 396 candidates across all 11 families, including same-structure context-change variants, pass validation and preserve the original answer.
- Node verification confirms a completed no-support stage test can update and persist a dynamic curve, while an incomplete test cannot.
- Node verification confirms tagged answers distinguish independent completion, hinted completion, and transfer evidence by ability dimension.
- Browser verification confirms one student answer immediately appears as tagged learning evidence in the observer foundation, with no console errors.
- Node verification confirms the SQLite data layer reads and writes a plan, behavior event, and assessment session with student / subject boundaries intact.
- Node verification confirms the browser repositories mirror and hydrate plans, sessions, and behavior records without duplicate practice events.
- Browser verification confirms a real practice answer writes to the local API and returns as tagged evidence after a refresh, with no console errors.
- Node verification confirms 264 generated candidates across every current math family, variant type, and seed boundary pass the complete ten-group tag contract.
- Node verification confirms a complete four-question stage test persists a verified dynamic curve, while the same runtime retains test evidence independently of the curve decision.
- Browser verification confirms the required progression stays focused on one task, optional practice only becomes available after completion, and the student surface no longer exposes backend allocation ratios or profile labels.
- Student-plan repository has a browser-storage fallback and an in-memory test path for later API replacement.
- Assessment-session repository stores response-level records and question metadata with a browser-storage fallback.
- Behavior-event repository persists up to 2,000 events per student locally, ready to be moved behind the behavior-event API.
- Next-practice allocation is persisted inside the student-plan record alongside its behavior inputs and guardrail.
- Stage-assessment scoring now requires a complete, no-support test session before it can produce a dynamic curve; daily practice and incomplete tests are rejected from curve updates.
- Student-plan records now preserve stage-assessment evidence and the latest verified dynamic curve separately from the static curve and next-practice allocation.
- Tagged practice answers now persist their ability dimensions, knowledge-atlas nodes, controlled variant changes, correctness, and hint depth as a reusable learning-evidence layer.
- Learning evidence now informs the next-practice transfer signal and refreshes the observer foundation immediately after a student action, without changing the dynamic curve.
- Native Node + SQLite local runtime now serves the app and API together on port 4176, with student plans, behavior events, and assessment sessions stored in structured tables.
- Browser-side plan, assessment, and behavior repositories now mirror new records to the local API and hydrate server records on startup; browser storage remains an offline fallback.
- Daily allocation now reads a bounded set of behavior signals: error and retry patterns, hint-free completion, reproduction, transfer, rapid wrong answers, voluntary practice, challenge completion, and fatigue. The next-day mix is smoothed so no bucket shifts by more than 10 percentage points at once.
- Practice events now record per-question response time, optional-practice mode, and challenge evidence; these refine tomorrow's allocation but never change the dynamic curve.
- Optional same-type and harder practice are now real validated queues. They only appear after the required daily progression is completed, and are labelled as optional evidence rather than a change to the day's required task.
- Every generated math question now carries the full ten-group item-tag contract: system level, difficulty, knowledge, atlas, ability, practice, generation, solution, evidence, and quality tags. The validator rejects an incomplete tag contract before delivery.
- The same item-tag contract now travels with practice events and stage-test snapshots, so later reporting and personalization have one traceable evidence source.
- A behavior-aware daily queue now turns allocation buckets into validated delivery descriptors. The first required practice family is selected from that queue, so a prior wrong family can become the next day's starting point while the static curve still supplies the planned progression direction.
- Today and next-learning-day queues are now stored separately. Behavior recorded today can prepare tomorrow's queue, but a reload cannot rewrite the task already assigned for today.
- The stage-assessment runtime now creates no-help test sessions from shared validated items, records responses, scores mastery and transfer, creates a dynamic curve only when the test is complete, and persists the result as a reusable assessment record.
- Generated support text now follows the chosen real-world context, so the question, layered hints, strategies, and guided steps use the same objects and relationships.

## Sprint 1 Entry And Baseline

Status: started.

Already represented in prototype:

- Basic information.
- Psychological personality.
- Learning personality.
- Subject selection concept.
- Initial ability test concept.
- Ability map.
- Goal and learning rhythm.
- Static learning curve.

Next development work:

1. Extend additional answer formats only through the same bounded input model, with verified rendering, scoring, Help You Learn, recall, and export paths.
2. Add real login, account editing, and cloud deployment / API layers on top of the local runtime contract.
3. Expand parent / teacher pages from configurable report schema into dedicated operating views.
4. Prepare a clean system walkthrough only after the core loop is stable.

## Guardrail

Do not spend additional time on PPT / video until the system loop progresses further.

Investor materials exist as first drafts, but the active work is system implementation.

# 2026-07-14: Server evidence snapshots and optional practice

- [x] Moved the completed initial-test ability map to a server-derived result used by both the student result view and static-curve confirmation.
- [x] Added an access-controlled server knowledge-atlas snapshot; only completed initial-test evidence and server-scored practice answers can light the map.
- [x] Connected student and observer map rendering to the server atlas when the local runtime is available, with browser fallback retained for the prototype.
- [x] Added server-owned optional same-type and harder practice sessions after today's required run.
- [x] Optional sessions release one validated delivery at a time, preserve private seeds, record server-scored behavior, and do not create or consume future calendar tasks.
- [x] Applied the same independent-confirmation rule to optional practice: a hint- or guided-step-assisted correct answer recreates the current optional item once without support before the next item can release.
- [x] Unified independent-completion evidence across reports, matching, knowledge maps, ability evidence, and practice trends: neither an opened hint nor an opened guided step can be counted as independent work.
- [x] Added contract coverage for initial ability-map results, knowledge-atlas evidence boundaries, and optional-practice progression.
- [x] One-click wrong-question replay now creates a server-owned optional session only after today's required practice is complete.
- [x] The server selects previously wrong, server-scored deliveries from the same daily run and regenerates the original validated prompt from private generation metadata.
- [x] Retry source identifiers, seeds, answers, and unreleased items stay off the public response; replay answers become trusted behavior evidence without changing the dynamic curve.
- [x] A replay delivery now offers a protected “recall first” reference with the student's own earlier response, without returning the answer key.
- [x] Added a shared Shanghai-style G1-G6 math knowledge graph. Every generator family now carries validated family, concept, prerequisite, and next-node relations, with an access-controlled server graph snapshot for atlas and later recommendation use.
- [x] Added validated, answer-safe solution strategies to every server-delivered practice item: relation/model, visual/table, and logical trial-and-check. Formal assessment continues to expose no help route.
- [x] Connected the knowledge-atlas library to the shared server graph. A student can open a new family as a standalone `atlas_related` exploration without changing today's required sequence, calendar task, or learning curve.
- [x] Hardened public question presentations so generation seeds and scoring internals remain server-only while curriculum, graph, and support metadata remain available to the learning UI.
- [x] Made challenge selection graph-aware: the daily queue enters a linked successor only after independent mastery evidence covers the anchor and every named prerequisite; otherwise it uses a deeper same-family variation.
- [x] Applied the same graph-aware boundary to voluntary “再难一点” practice: it can enter one verified next family only after the same prerequisite evidence, otherwise it remains a same-family two-variable challenge. Voluntary challenge never advances the required route.
- [x] Expanded the bounded Math generator beyond number-only changes: relationship-reframe, question-first ordering, context change, and a bounded added-organization step now have explicit candidate traces and validation gates. Required daily progression remains the simpler original / one-number / two-number sequence.
- [x] Stage tests now rotate their transfer probe across new context, relation wording, and question ordering on later attempts. These remain formal no-help items and count as controlled reading-form transfer evidence alongside numeric variation.
- [x] Initial ability tests now retain one bounded same-family form-transfer probe alongside grade-level breadth. Its scene, relationship wording, or question-order variation is selected from the validated logic library and contributes to the starting transfer dimension without changing the curve directly.
- [x] Verified formal-test transfer evidence is now aggregated separately in the server report. Students receive a short test-history note; parents and teachers can enable a compact module showing only verified, no-help aggregate results by expression change.
- [x] Full grade-level attainment now requires correct formal-test evidence across at least two different reading-form transfer types. A single verified stage test still recalibrates the dynamic curve; it simply cannot overstate whole-grade mastery.
- [x] Filtered untrusted answer submissions before server-side behavior analysis and daily queue construction, so only server-scored answers can influence the next learning day.
- [x] Replaced the fixed per-grade daily-family default with a curve-aware G1-G6 knowledge-point route that holds on observed unfinished work and only advances after an independently completed original / one-number / two-number unit.
# 2026-07-13: Stage assessment runtime

- [x] Added a student-facing stage-test flow with no hints, fuzzy progress, and no visible total-question count.
- [x] Reused the validated math item generator for stage-test questions and preserved item tags in the assessment snapshot.
- [x] Persisted stage responses and verified results through the assessment-session repository and local API mirror.
- [x] Connected a completed, support-free, fully validated stage assessment to the dynamic learning curve and student-plan history.
- [x] Verified the full browser flow: start test, answer four generated questions, persist result, and update the dynamic curve without browser errors.

# 2026-07-13: Continuous daily practice queue

- [x] Expanded the generated daily question queue from one visible seed item into a full mandatory practice flow.
- [x] Each internal queue unit now follows `original -> one-number change -> two-number change`; the next unit begins only after the unit is completed.
- [x] Removed visible step numbers from the student flow and added a deliberately fuzzy progress bar with no total-question count.
- [x] Verified in the browser that a completed three-question unit advances to the next generated item with no console errors.
- [x] Made the post-practice `retry wrong questions` action create a separate queue from only the student's actual wrong questions.

# 2026-07-13: Persistent daily practice session

- [x] Added a date-scoped daily-practice-session repository with browser-local persistence and a matching SQLite/API record.
- [x] Persisted the active queue snapshot, current position, mandatory completion, optional practice, detail state, hint depth, and guided-step state.
- [x] Verified browser refresh resumes the same generated practice item instead of restarting the day.
- [x] Verified the local API returns the persisted session at `GET /api/daily-practice-sessions/:studentId/:subjectId?practiceDate=...`.

# 2026-07-13: Dynamic-curve task handoff

- [x] Added a learning-task planner that accepts either a static curve or a verified dynamic curve.
- [x] A verified stage test now stores a task basis for the next learning day; the in-progress day remains unchanged.
- [x] The next-day allocation engine uses that dynamic task basis while daily behavior still only refines the next question queue.
## 2026-08-01: Behavior-Refined Support Signals

- Added an adult-only, server-derived behavior signal snapshot that turns trusted practice evidence into at most three actionable support observations.
- Kept students out of the raw signal route; the student report continues to receive only gentle progress and next steps.
- Connected the observer dashboard to the snapshot and documented the data boundary, including the formal-test-only curve rule.
## 2026-08-01: Real Student Report Curve

- Replaced the decorative student-report mini curve with a renderer driven by the persisted static curve and, after formal verification, its dynamic overlay.
- Kept the student-facing explanation short and consistent with the core boundary: daily practice changes matching; formal tests recalibrate the curve.
## 2026-08-01: Voluntary Reflection Evidence

- Added one bounded summary-offer event per completed daily run, so optional review and atlas behavior can be interpreted from an offered-versus-opened record instead of guessing from silence.
- Adult-only behavior signals now preserve the student's choice: low review use means keep reflection optional, not add pressure or a negative label.
