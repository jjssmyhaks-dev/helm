import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Database backup service.
 * 
 * Backs up PostgreSQL using pg_dump. For production:
 * - Supabase: enable Point-in-Time Recovery (PITR) on the dashboard
 * - Railway: enable daily backups in service settings
 * - This service handles custom backup logic for self-hosted deployments
 * 
 * Backups are stored locally in ./backups/ or uploaded to S3/GCS.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  /**
   * Daily backup at 2:00 AM UTC — covers all tables including Prisma-managed schema.
   * Disable in production by setting BACKUP_ENABLED=false.
   */
  @Cron('0 2 * * *')
  async dailyBackup() {
    if (process.env.BACKUP_ENABLED === 'false') {
      this.logger.log('Backups disabled via BACKUP_ENABLED=false');
      return;
    }

    this.logger.log('Starting daily database backup...');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `helm-backup-${timestamp}.sql.gz`;

      // pg_dump with compression
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        this.logger.error('DATABASE_URL not set — skipping backup');
        return;
      }

      const { stdout, stderr } = await execAsync(
        `pg_dump "${databaseUrl}" --no-owner --no-privileges | gzip > ./backups/${filename}`,
        { timeout: 300_000 }, // 5 minute timeout
      );

      if (stderr) {
        this.logger.warn(`pg_dump warnings: ${stderr}`);
      }

      this.logger.log(`Backup completed: ${filename}`);

      // Cleanup backups older than 30 days
      await this.cleanupOldBackups();
    } catch (error) {
      this.logger.error(`Backup failed: ${error}`);
    }
  }

  /**
   * Manual backup trigger — can be called via API endpoint.
   */
  async triggerBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `helm-manual-${timestamp}.sql.gz`;
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL not set');
    }

    try {
      await execAsync(
        `pg_dump "${databaseUrl}" --no-owner --no-privileges | gzip > ./backups/${filename}`,
        { timeout: 300_000 },
      );

      this.logger.log(`Manual backup completed: ${filename}`);
      return { success: true, filename };
    } catch (error) {
      this.logger.error(`Manual backup failed: ${error}`);
      throw error;
    }
  }

  /**
   * List available backups.
   */
  async listBackups() {
    try {
      const { stdout } = await execAsync('ls -lh ./backups/*.sql.gz 2>/dev/null | awk \'{print $5, $9}\'');
      if (!stdout.trim()) return { backups: [], total: 0 };

      const backups = stdout.trim().split('\n').map((line) => {
        const [size, filename] = line.split(' ');
        return { filename: filename?.replace('./backups/', '') || '', size };
      }).filter(b => b.filename);

      return { backups, total: backups.length };
    } catch {
      return { backups: [], total: 0 };
    }
  }

  /**
   * Restore from a backup file.
   */
  async restoreBackup(filename: string) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL not set');

    this.logger.warn(`Restoring backup: ${filename}`);

    try {
      await execAsync(
        `gunzip -c ./backups/${filename} | psql "${databaseUrl}" --no-owner`,
        { timeout: 600_000 }, // 10 minute timeout
      );

      this.logger.log(`Restore completed: ${filename}`);
      return { success: true, filename };
    } catch (error) {
      this.logger.error(`Restore failed: ${error}`);
      throw error;
    }
  }

  /**
   * Delete backups older than 30 days.
   */
  private async cleanupOldBackups() {
    try {
      await execAsync('find ./backups -name "helm-backup-*.sql.gz" -mtime +30 -delete');
      this.logger.log('Cleaned up backups older than 30 days');
    } catch {
      // Ignore — no backups to clean is fine
    }
  }
}
