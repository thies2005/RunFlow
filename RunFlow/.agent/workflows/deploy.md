---
description: Automated deployment to master branch with versioning and Docker Hub push
---

# Deploy Workflow V3 (Simplified)

This workflow automates the release process: version bump, Docker image build/push, and git push to master.

## Usage

```powershell
.\scripts\deploy.ps1 "Your commit message"
```

Use `-SkipDocker` flag to skip rebuilding Docker images (e.g., for documentation-only changes).

## What it does

1.  **Bumps Version**: Automatically increments the patch version in `package.json` (e.g., `1.1.0` -> `1.1.1`).
2.  **Builds & Pushes**: Creates a multi-arch Docker image (amd64/arm64) tagged with both version AND `latest`.
3.  **Commits & Pushes**: Commits all changes and pushes to `origin/master`.

## Docker Setup

The `docker-compose.yml` is configured to:
- **Pull** the app image from Docker Hub (`t23wes3/runflow:latest`)
- **Build** the migrator from local source (for Prisma schema updates)

```yaml
app:
  image: t23wes3/runflow:latest
  pull_policy: always

migrator:
  build:
    context: .
    dockerfile: Dockerfile
    target: builder
```

## Server Deployment

After running the deploy script:
```bash
git pull
docker compose up -d
```
