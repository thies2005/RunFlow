---
description: Automated dual-branch deployment (Main=Build, Hub=Image) with versioning
---

# Deploy Workflow V2

This workflow automates the entire release process, managing versions and two separate git branches.

## Usage

```powershell
.\scripts\deploy.ps1 "Your commit message"
```

## What it does

1.  **Bumps Version**: Automatically increments the patch version in `package.json` (e.g., `1.1.0` -> `1.1.1`).
2.  **Builds & Pushes**: Creates a multi-arch Docker image tagged with the new version AND `latest`.
3.  **Updates `main` Branch**:
    *   Configures `docker-compose.yml` for **Local Build** (`build: .`).
    *   Commits changes and pushes to `origin/main`.
4.  **Updates `dockerhub` Branch**:
    *   Switches to `dockerhub` branch (creates it if missing).
    *   Merges `main`.
    *   Configures `docker-compose.yml` for **Image Pull** (`image: ...` and `pull_policy: always`).
    *   Commits and pushes to `origin/dockerhub`.
    *   Switches back to `main`.

## Configuration

The script manages `docker-compose.yml` automatically by toggling comments.

*   **Main Branch**:
    ```yaml
    build:
      context: .
    # image: ...
    ```
*   **Dockerhub Branch**:
    ```yaml
    # build:
    #   context: .
    image: t23wes3/runflow:latest
    pull_policy: always
    ```
