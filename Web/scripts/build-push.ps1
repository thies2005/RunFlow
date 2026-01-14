# Build and Push Multi-Architecture Image to Docker Hub
# Usage: .\scripts\build-push.ps1 [-Tag "v1.0.0"] [-Latest]
#
# Examples:
#   .\scripts\build-push.ps1                    # Builds and pushes with version from package.json
#   .\scripts\build-push.ps1 -Tag "v2.0.0"     # Builds and pushes with specific tag
#   .\scripts\build-push.ps1 -Latest           # Also tags as 'latest'

param (
    [string]$Tag = "",
    [switch]$Latest
)

$ErrorActionPreference = "Stop"

# Configuration
$DockerUser = "t23wes3"
$ImageName = "runflow"

# Get version from package.json if no tag provided
if (-not $Tag) {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $Tag = "v$($packageJson.version)"
}

$FullImageName = "${DockerUser}/${ImageName}:${Tag}"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Multi-Arch Docker Build & Push" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Image: $FullImageName" -ForegroundColor Yellow
Write-Host "Platforms: linux/amd64, linux/arm64" -ForegroundColor Yellow
Write-Host ""

# Setup buildx builder if needed
$builderName = "runflow-builder"
if (-not (docker buildx ls | Select-String $builderName)) {
    Write-Host "[SETUP] Creating buildx builder..." -ForegroundColor Gray
    docker buildx create --name $builderName --use > $null
    docker buildx inspect --bootstrap > $null
} else {
    docker buildx use $builderName > $null
}

# Build command
$buildArgs = @(
    "buildx", "build",
    "--platform", "linux/amd64,linux/arm64",
    "-t", $FullImageName
)

# Add latest tag if requested
if ($Latest) {
    $LatestImageName = "${DockerUser}/${ImageName}:latest"
    $buildArgs += @("-t", $LatestImageName)
    Write-Host "Also tagging as: $LatestImageName" -ForegroundColor Yellow
}

$buildArgs += @("--push", ".")

Write-Host ""
Write-Host "[BUILD] Starting multi-architecture build..." -ForegroundColor Green

# Execute build
& docker @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Image pushed: $FullImageName" -ForegroundColor Cyan
if ($Latest) {
    Write-Host "Also pushed:  $LatestImageName" -ForegroundColor Cyan
}
Write-Host ""
