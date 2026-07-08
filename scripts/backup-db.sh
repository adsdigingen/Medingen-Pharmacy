#!/bin/bash

# ==============================================================================
# MEDINGEN PHARMACY ERP - AUTOMATED DATABASE BACKUP SCRIPT
# ==============================================================================

# Configuration
DB_NAME=${DB_NAME:-"medingen_cloud"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-5432}
BACKUP_DIR=${BACKUP_DIR:-"/var/backups/medingen"}
RETENTION_DAYS=30

# File names
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="${DB_NAME}_backup_${DATE}.sql.gz"
LOGFILE="${BACKUP_DIR}/backup_audit.log"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[${DATE}] Starting backup for database: ${DB_NAME}..." >> "${LOGFILE}"

# Run pg_dump, compress and write output file
PGPASSWORD="${PG_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Verify backup success
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "[${DATE}] SUCCESS: Backup saved to ${BACKUP_DIR}/${FILENAME}" >> "${LOGFILE}"
    
    # Placeholder for S3 copy:
    # aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://medingen-backups/${FILENAME}"
    
    # Prune old local backups
    find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    echo "[${DATE}] Pruned backups older than ${RETENTION_DAYS} days." >> "${LOGFILE}"
else
    echo "[${DATE}] ERROR: Database backup failed." >> "${LOGFILE}"
    exit 1
fi
