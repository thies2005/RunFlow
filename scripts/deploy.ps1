# Deploy Script
# Usage: .\scripts\deploy.ps1 "Commit message"

param (
    [Parameter(Mandatory=$true)]
    [string]$Message
)

# Configuration
$DockerUser = "t23wes3" 
$ImageName = "runflow"
$Tag = "latest"
$FullImageName = "${DockerUser}/${ImageName}:${Tag}"

Write-Host "[DEPLOY] Starting deployment process..." -ForegroundColor Cyan

# 1. Build Docker Image
Write-Host ""
Write-Host "[BUILD] Building Docker image: $FullImageName..." -ForegroundColor Yellow
docker build -t $FullImageName .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
    exit 1
}

# 2. Push to Docker Hub
Write-Host ""
Write-Host "[PUSH] Pushing to Docker Hub..." -ForegroundColor Yellow
docker push $FullImageName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed! Make sure you are logged in with 'docker login'."
    exit 1
}

# 3. Git Operations
Write-Host ""
Write-Host "[GIT] Pushing code to GitHub..." -ForegroundColor Yellow
git add .
git commit -m $Message
git push
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git push failed!"
    exit 1
}

Write-Host ""
Write-Host "[DONE] Deployment complete! Code pushed and Image updated." -ForegroundColor Green
