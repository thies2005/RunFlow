# AGENTS.md

## Core Rules

- Ask clarifying questions only when requirements are ambiguous, risky, conflict with existing patterns, or have meaningful tradeoffs. Do not ask for trivial tasks.
- Make the smallest correct change. Do not refactor unrelated code or over-engineer.
- First follow RunFlow's existing patterns for Flutter, Next.js, API routes, Prisma, state management, routing, folder structure, naming, and testing style.
- If best practice and minimal change conflict, ask the user before proceeding.
- Use targeted searches before reading large files to preserve context.
- Never commit secrets, credentials, API keys, `.env` files, generated private artifacts, or unrelated user changes.

## Repository Layout

- `flutter/`: Flutter app for RunFlow mobile/native experiences.
- `Web/`: Next.js 15 web app, PWA, API server, Prisma schema/migrations, Capacitor wrapper, and deployment config.
- Root `package.json`: minimal shared Node dependencies only; most web/server commands belong in `Web/`.

## Flutter Commands

Run from `flutter/`.

### Analyze
```bash
flutter analyze
```

### Test
```bash
flutter test
```

### Web Tests
```bash
flutter test --platform chrome
```

### Integration Tests
```bash
flutter test integration_test
```

Skip only if `flutter/integration_test/` does not exist.

### Build APK
Always include the Strava Client ID.

```bash
flutter build apk --release --dart-define=STRAVA_CLIENT_ID=193995
```

## Web And Server Commands

Run from `Web/`.

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Prisma
```bash
npm run db:generate
npm run db:push
```

Use migrations for schema changes intended for shared or production databases. Do not use `db:push` as a substitute for a committed migration when the change must be versioned.

### Docker Server
```bash
docker compose up -d --build
```

For local development with Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Bugs And Features

1. Research the codebase to find the root cause or integration point. Identify relevant architecture and conventions before planning.
2. Create a short plan listing files to change, intended logic, and how the change fixes the bug or implements the feature.
3. Audit the plan for correctness, architectural consistency, edge cases, regressions, and unintended side effects. Use a subagent for non-trivial changes.
4. Improve the plan until it is sound. If required changes materially alter the approach, ask the user before implementation.
5. Implement only the approved plan and avoid unrelated files.
6. Run an independent review for correctness, code quality, performance, and security on non-trivial changes.
7. If review finds issues, fix and re-review up to 3 times. If issues persist, revert only the agent's own changes, halt, and escalate to the user.

## Flutter Guidance

- Preserve the existing Riverpod, GoRouter, model generation, and folder conventions.
- Prefer generated models/providers where the project already uses `freezed`, `json_serializable`, `riverpod_annotation`, or `build_runner`.
- If generated files are affected, run the appropriate generator from `flutter/`:

```bash
dart run build_runner build --delete-conflicting-outputs
```

- Keep Strava build-time configuration via `String.fromEnvironment('STRAVA_CLIENT_ID')`; do not hardcode new secrets or credentials.

## Web And Server Guidance

- Preserve Next.js App Router conventions under `Web/src/app`.
- Treat `Web/src/app/api/**/route.ts` as server/API code. Validate inputs, enforce authentication/authorization, and avoid leaking sensitive data in responses or logs.
- Follow `CODING_STANDARDS.md` for TypeScript, React, API, database, security, testing, and naming guidance.
- Keep server logic in existing service/lib layers when patterns already exist; do not move route logic broadly unless required.
- For Prisma changes, update `Web/prisma/schema.prisma` and add/version migrations when needed. Regenerate Prisma clients after schema changes.
- For mobile API changes, check `Web/MOBILE_API.md` and keep Flutter/mobile clients compatible unless the user explicitly requests a breaking change.

## Verification And Pushes

Before any commit or push, run all applicable checks for the areas changed and ensure GitHub workflows would pass. Do not push if any required check fails.

For Flutter changes, run from `flutter/`:

```bash
flutter analyze
flutter test
flutter test --platform chrome
flutter test integration_test
```

Skip `flutter test integration_test` only if `flutter/integration_test/` does not exist.

For Web/server changes, run from `Web/`:

```bash
npm run lint
npm test
npm run test:integration
npm run build
```

Run `npm run test:e2e` when UI flows, auth flows, routing, browser behavior, or Playwright-covered functionality changes.

Run any additional workflow, database, Docker, or deployment checks present in the repository when relevant to the change.

## Commit Style

- Use Conventional Commits for commit messages, such as `fix: correct login validation`, `feat: add workout export`, or `chore: update prisma client`.
- Do not commit unless the user explicitly asks.
