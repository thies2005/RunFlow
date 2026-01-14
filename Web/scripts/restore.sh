#!/bin/bash

# Check if a backup file was provided
if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_filename>"
  echo "Example: ./restore.sh backup_2024-01-01.sql.gz"
  echo "Available backups:"
  ls -lh backups/
  exit 1
fi

BACKUP_FILE=$1

# Check if the file exists in the backups directory
if [ ! -f "backups/$BACKUP_FILE" ]; then
  echo "Error: Backup file 'backups/$BACKUP_FILE' not found."
  exit 1
fi

echo "WARNING: This will overwrite the current database with the contents of $BACKUP_FILE."
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Stopping app service..."
docker compose stop app

echo "Restoring database..."
# We use the backup container to perform the restore to ensure compatibility
# The backup container mounts ./backups to /backups
docker compose run --rm backup sh -c "zcat /backups/$BACKUP_FILE | psql -h db -U runflow -d runflow"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully."
else
    echo "Restore failed."
    docker compose start app
    exit 1
fi

echo "Restarting app service..."
docker compose start app
echo "Done."
