---
description: Build Docker image, push to Hub, and push code to GitHub
---

# Deploy Workflow

This workflow automates the process of building your Docker image, pushing it to Docker Hub, and committing/pushing your code changes to GitHub.

## Prerequisites

1.  **Docker Login**: Ensure you are logged into Docker Hub locally.
    ```powershell
    docker login
    ```
2.  **Configuration**: Open `scripts/deploy.ps1` and update the `$DockerUser` variable with your actual Docker Hub username.
    ```powershell
    $DockerUser = "your-username" 
    ```

## Usage

Run the script from the project root using PowerShell. You must provide a commit message.

```powershell
.\scripts\deploy.ps1 "Your commit message here"
```

## What it does

1.  **Builds** the Docker image using the `Dockerfile` in the root.
2.  **Pushes** the image to Docker Hub as `<username>/runflow:latest`.
3.  **Adds** all changes to git (`git add .`).
4.  **Commits** changes with your provided message.
5.  **Pushes** the commit to GitHub.
