Write-Host "🚀 Starting Deployment..." -ForegroundColor Cyan

# 1. Pull latest changes
Write-Host "📥 Pulling from git..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git pull failed!"
    exit 1
}

# 2. Deploy without downtime (skipping 'down')
Write-Host "🏗️  Building and Deploying..." -ForegroundColor Yellow
# --build ensures we get the new code
# -d runs in detached mode
# --remove-orphans cleans up
docker compose up -d --build --remove-orphans

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "   Version v1.0.0 is live."
} else {
    Write-Error "❌ Deployment Failed!"
}
