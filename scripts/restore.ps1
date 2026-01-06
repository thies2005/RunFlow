param (
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

# Check if the file exists in the backups directory
if (-not (Test-Path "backups\$BackupFile")) {
    Write-Error "Backup file 'backups\$BackupFile' not found."
    Write-Host "Available backups:"
    Get-ChildItem backups | Select-Object Name, Length, LastWriteTime
    exit 1
}

$confirmation = Read-Host "WARNING: This will overwrite the current database with the contents of $BackupFile. Are you sure you want to proceed? (y/N)"
if ($confirmation -ne 'y') {
    Write-Host "Restore cancelled."
    exit
}

Write-Host "Stopping app service..."
docker compose stop app

Write-Host "Restoring database..."
# We use the backup container to perform the restore to ensure compatibility
# The backup container mounts ./backups to /backups
# Note: Using sh -c inside the linux container
docker compose run --rm backup sh -c "zcat /backups/$BackupFile | psql -h db -U runflow -d runflow"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restore completed successfully."
}
else {
    Write-Error "Restore failed."
    docker compose start app
    exit 1
}

Write-Host "Restarting app service..."
docker compose start app
Write-Host "Done."
