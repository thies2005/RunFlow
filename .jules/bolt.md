## 2026-01-14 - [Missing Lint Config & No Component Tests]
**Learning:** The repository lacked a basic `.eslintrc.json` for Next.js, preventing `npm run lint` from running non-interactively. Also, critical UI components like `ActivityList` have no unit tests.
**Action:** Always check for lint configuration before running lint commands. Rely on manual verification or add basic tests when safe to do so.
