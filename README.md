# AI Education — Semi AI

A working adaptive mathematics learning platform for students, parents and
teachers. The student journey connects onboarding and assessment, learning goals,
daily practice, progressive hints, independent retries and controlled variants,
learning reports, and a knowledge atlas. The bounded question engine contains
41 G1–G6 mathematics families; it does not call a production LLM.

## Repositories and deployments

- [ai-education](https://github.com/EastsCloud/ai-education): primary development
  and shared team testing, authenticated APIs backed by SQLite.
- [ai-education-demo](https://github.com/EastsCloud/ai-education-demo): portfolio
  demonstration, fictional browser-local data and a three-role experience entry.

The application source is synchronized in both repositories. Runtime mode is set
by `AI_EDUCATION_PUBLIC_DEMO`: `false` for testing, `true` for the portfolio.
Each Render service has its own disk and database. Create the root `render.yaml`
Blueprint **once from the primary repository** to create both services.

Follow [the Render service and disk guide](docs/18_Render部署与双仓库维护.md).
Both services are Web Services, not Static Sites. Do not create Render Postgres:
the existing database is SQLite on a persistent disk at `/var/data`.

## Local development

Use Node.js 24 (the cloud runtime is pinned in `.node-version`). There are no
third-party runtime dependencies and no frontend build step.

```bash
npm start
```

Open `http://127.0.0.1:4176/signin.html`. Register a student, parent, or teacher.
The database is created automatically at `data/ai-education.sqlite`. Local
development retains fictional built-in accounts; cloud startup disables them.
For a local portfolio preview, open `http://127.0.0.1:4176/demo.html`.

On Windows the existing scripts can use the bundled Node installation:

```powershell
.\scripts\dev.ps1 -Action start -Mode clean -Port 4176
.\scripts\dev.ps1 -Action test
.\scripts\dev.ps1 -Action e2e
```

The original five-family SQLite snapshot is retained in the local delivery
archive, not Git. Generate a fresh cohort using the E2E command below.
`.env.example` documents settings; the application does not load `.env` implicitly.

## Verification

```bash
npm test
npm run test:e2e
npm run test:render
```

The suite contains 97 contract scripts. E2E creates five learner families and
checks their learning flows, permissions, reports and persistence. The Render
smoke test starts the real cloud entry point, registers an account, restarts it
with the same database, verifies the session, and checks portfolio mode.
GitHub Actions runs these checks on pushes and pull requests in both repositories.

## Publishing updates

`origin` points to the primary repository and `demo` to the portfolio repository.
After committing to `main`, publish the same commit to both:

```powershell
.\scripts\push-both.ps1
```

The script verifies remote URLs and histories and does not force-push.
Render's auto-deploy updates each linked service after publishing.
After a fresh clone of the primary repo, first add the second remote:
`git remote add demo https://github.com/EastsCloud/ai-education-demo.git`.

## Project background

Start with [the architecture](docs/03_技术架构与数据流.md) and
[the development handover](docs/16_项目理解与开发接手手册.md).
The September 2026 delivery documents, SBOM and checksum manifest describe the
original frozen local package. The manifest is an archive baseline, not a checksum
for the evolving Git checkout. See the deployment guide for current setup.

This deployment is for development, team testing and fictional portfolio examples.
It does not establish readiness for a public production launch or real student data.
