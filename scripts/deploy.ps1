# Deploy Script V2
# Usage: .\scripts\deploy.ps1 "Commit message"

param (
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

# Configuration
$DockerUser = "t23wes3" 
$ImageName = "runflow"
$DockerComposePath = "docker-compose.yml"
$BranchMain = "main"
$BranchHub = "dockerhub"

# Helper to check git status
function Check-GitClean {
    $status = git status --porcelain
    if ($status) {
        # Allow deployment if the only changes are tracked files we are about to commit
        # But for safety, warn or just proceed? Ideally we commit everything.
        Write-Host "[GIT] Workdir has changes. They will be included." -ForegroundColor DarkGray
    }
}

# Helper to update docker-compose.yml
function Update-ComposeConfig {
    param ([string]$Mode) # "local" or "hub"
    
    $content = Get-Content $DockerComposePath -Raw
    
    if ($Mode -eq "local") {
        # Enable Build, Disable Image
        $content = $content -replace '#\s*build:', 'build:'
        $content = $content -replace '#\s*context:', '  context:'
        $content = $content -replace '#\s*dockerfile:', '  dockerfile:'
        
        # Comment out image if active
        if ($content -match '\n\s+image:') {
            $content = $content -replace '(\n\s+)(image:)', '$1# $2'
            $content = $content -replace '(\n\s+)(pull_policy:)', '$1# $2'
        }
    }
    elseif ($Mode -eq "hub") {
        # Disable Build
        if ($content -match '\n\s+build:') {
             $content = $content -replace '(\n\s+)(build:)', '$1# $2'
             $content = $content -replace '(\n\s+)(context:)', '$1# $2'
             $content = $content -replace '(\n\s+)(dockerfile:)', '$1# $2'
        }
        
        # Enable Image
        $content = $content -replace '#\s*image:', 'image:'
        $content = $content -replace '#\s*pull_policy:', 'pull_policy:'
    }
    
    Set-Content -Path $DockerComposePath -Value $content -Encoding UTF8
    Write-Host "[CONFIG] Updated docker-compose for $Mode environment." -ForegroundColor Gray
}

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
} else {
    Write-Host ""
    Write-Host "[BUILD] Building and Pushing Multi-Arch Image ($newVersion)..." -ForegroundColor Yellow

    # Setup builder if needed
    if (-not (docker buildx ls | Select-String "runflow-builder")) {
        docker buildx create --name runflow-builder --use > $null
        docker buildx inspect --bootstrap > $null
    } else {
        docker buildx use runflow-builder > $null
    }

    docker buildx build --platform linux/amd64,linux/arm64 -t $FullImageName -t $LatestImageName --push .
    if ($LASTEXITCODE -ne 0) { Write-Error "Docker build/push failed!"; exit 1 }
}

# 3. Handle Main Branch (Local Build Config)
Write-Host ""
Write-Host "[GIT] Updating '$BranchMain' branch..." -ForegroundColor Yellow
Update-ComposeConfig -Mode "local"

git add .
git commit -m "$Message (v$newVersion)"
git push origin $BranchMain
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to push to $BranchMain"; exit 1 }

# 4. Handle Dockerhub Branch (Image Pull Config)
Write-Host ""
Write-Host "[GIT] Updating '$BranchHub' branch..." -ForegroundColor Yellow

# Check if branch exists, if not create it
if (-not (git show-ref --verify refs/heads/$BranchHub)) {
    Write-Host "Creating $BranchHub branch..."
    git branch $BranchHub
}

git checkout $BranchHub
git merge $BranchMain -m "Merge $BranchMain into $BranchHub"

Update-ComposeConfig -Mode "hub"

git add $DockerComposePath
git commit -m "Configure for DockerHub deployment (v$newVersion)"
git push origin $BranchHub
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Push failed, trying to pull/rebase..." -ForegroundColor Red
    git checkout $BranchMain
    exit 1 
}

# 5. Cleanup
git checkout $BranchMain
Write-Host ""
Write-Host "[DONE] Deployment complete! v$newVersion pushed to Hub & GitHub (Both branches)." -ForegroundColor Green
