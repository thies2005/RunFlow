---
description: Deploy to default branch and clean up redundant branches
---

1. Detect default branch and push
```powershell
# Deploy to master and clean up main
Write-Host "Deploying to master..."

# Push current HEAD to master
git push origin HEAD:master

# Cleanup main if it exists
Write-Host "Attempting to delete main..."
git push origin --delete main
```
