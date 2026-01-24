# Deploy Script V3 (Simplified)
# Usage: .\scripts\deploy.ps1 "Commit message"

param (
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

# Configuration
$DockerUser = "t23wes3" 
$ImageName = "runflow"
$BranchMain = "master"

Write-Host "[DEPLOY] Starting deployment process..." -ForegroundColor Cyan

# 0. Ensure we are on main
$currentBranch = git branch --show-current
if ($currentBranch -ne $BranchMain) {
    Write-Error "Please run this script from the '$BranchMain' branch."
    exit 1
}

# 1. Bump Version
Write-Host ""
Write-Host "[VERSION] Bumping version..." -ForegroundColor Yellow
# Use npm to bump version without git tagging (we handle git)
$newVersion = npm version patch --no-git-tag-version
if (-not $?) { exit 1 }
Write-Host "New Version: $newVersion" -ForegroundColor Green

$FullImageName = "${DockerUser}/${ImageName}:${newVersion}"
$LatestImageName = "${DockerUser}/${ImageName}:latest"

# 2. Build and Push Docker
if ($SkipDocker) {
    Write-Host ""
    Write-Host "[BUILD] Skipping Docker build as requested." -ForegroundColor Magenta
}
else {
    Write-Host ""
    Write-Host "[BUILD] Building and Pushing Multi-Arch Image ($newVersion)..." -ForegroundColor Yellow

    # Setup builder if needed
    if (-not (docker buildx ls | Select-String "runflow-builder")) {
        docker buildx create --name runflow-builder --use > $null
        docker buildx inspect --bootstrap > $null
    }
    else {
        docker buildx use runflow-builder > $null
    }

    docker buildx build --platform linux/amd64,linux/arm64 -t $FullImageName -t $LatestImageName --push .
    if ($LASTEXITCODE -ne 0) { Write-Error "Docker build/push failed!"; exit 1 }
}

# 3. Commit and Push to Main
Write-Host ""
Write-Host "[GIT] Pushing to '$BranchMain'..." -ForegroundColor Yellow

git add .
git commit -m "$Message (v$newVersion)"
git push origin $BranchMain

if ($LASTEXITCODE -ne 0) { 
    Write-Error "Failed to push to $BranchMain"
    exit 1 
}

Write-Host ""
Write-Host "[DONE] Deployment complete! v$newVersion pushed to Hub & GitHub." -ForegroundColor Green
Write-Host ""
Write-Host "To deploy on VM:" -ForegroundColor Gray
Write-Host "  1. git pull" -ForegroundColor Gray
Write-Host "  2. docker compose up -d" -ForegroundColor Gray
Write-Host "For local dev, use: docker compose -f docker-compose.yml -f docker-compose.dev.yml up" -ForegroundColor Gray
