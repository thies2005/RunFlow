# Deploy to Docker Hub and GitHub

# 1. Build Images (uses 'image' name from docker-compose.yml)
Write-Host "Building Docker images..."
docker compose build

# 2. Push Images to Docker Hub
Write-Host "Pushing images to Docker Hub..."
docker compose push

# 3. Push Code to GitHub
Write-Host "Pushing code to GitHub..."
git add .
$commitMsg = Read-Host "Enter commit message (default: 'chore: deploy update')"
if ($commitMsg -eq "") { $commitMsg = "chore: deploy update" }
git commit -m "$commitMsg"
git push origin main

Write-Host "✅ Done! Images are on Docker Hub and code is on GitHub."
Write-Host "To update server: 'docker compose pull && docker compose up -d'"
