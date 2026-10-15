# Repository maintenance

The owner maintains two repositories together:
- `origin`: https://github.com/EastsCloud/ai-education.git — primary development and team testing.
- `demo`: https://github.com/EastsCloud/ai-education-demo.git — portfolio demonstration.

Keep application changes synchronized in both repositories when publishing an
authorized update. Use `scripts/push-both.ps1` on Windows. Never force-push over
independent changes; fetch and reconcile them first. The same render.yaml defines
two services with separate disks; create that Blueprint only once from origin.
The portfolio service sets AI_EDUCATION_PUBLIC_DEMO=true for browser-local
fictional data. Team testing keeps it false for authenticated SQLite-backed APIs.

Do not commit runtime databases, private environment variables, logs, or bundled
Node installations. Preserve the original delivery archive and local snapshots.
For deployment changes run the contract suite, the five-learner E2E, and the
Render runtime smoke test. Cloud startup must not reset or copy over an existing DB.
Before publishing deployment changes, export the committed Git tree to a clean
directory and run those checks there. Ignored local files must not mask missing
runtime dependencies. Keep /data/ anchored to the repository root: src/data/
contains required versioned curriculum source, not disposable runtime data.
