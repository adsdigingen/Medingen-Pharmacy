#!/bin/bash

# ==============================================================================
# MEDINGEN PHARMACY ERP - DATABASE RESTORE SCRIPT
# ==============================================================================

# Configuration
DB_NAME=${DB_NAME:-"medingen_cloud"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-5432}

# Input verification
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 /path/to/backup_file.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
echo "[${DATE}] WARNING: Starting database restore. This will overwrite the current database '${DB_NAME}'!"

# Double check confirmation
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Clean current database tables with Cascade
echo "Dropping existing database schema..."
PGPASSWORD="${PG_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Uncompress and restore database structure
echo "Restoring database structure from: ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${PG_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

if [ ${PIPESTATUS[1]} -eq 0 ]; then
    echo "SUCCESS: Database restored successfully!"
else
    echo "ERROR: Database restore failed."
    exit 1
fi
