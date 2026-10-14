# Changelog

## 1.0.0-semi-ai-mvp - 2026-09-08

### Delivered

- Real student, parent and teacher accounts, sessions and relationship permissions
- Student-only onboarding without a mandatory adult or teacher
- Basic information, psychological personality and learning-personality assessment
- Subject selection and no-help initial Math ability assessment
- Ability map, goal, learning rhythm and confirmed static curve
- Server-owned daily practice, cumulative hints, guided steps, recall and verified variants
- Optional extra practice, correct / wrong review and knowledge atlas
- Formal stage assessment and test-only dynamic curve updates
- Behavior evidence, role-specific reports, trends and anonymous peer reference
- SQLite persistence, 96 contract tests and a retained five-learner E2E run

### Corrected Before Delivery

- Removed adult and teacher requirements from the student's core path
- Prevented fresh students from inheriting seeded defaults or opening directly in practice
- Separated personality, learning personality and subject ability assessment
- Fixed observer report hydration and knowledge-map response handling
- Fixed teacher peer-module display and local-date handling
- Fixed sign-out / sign-in redirect loops during role switching

### Known Limits

- Shanghai G1-G6 Math has 41 executable families but is not yet chapter-complete
- No production generative-model provider is connected
- Local single-process SQLite runtime is not a public cloud deployment
- Public-launch compliance, security and real-student efficacy work remains

