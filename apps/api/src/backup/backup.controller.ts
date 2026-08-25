import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service.js';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a manual database backup' })
  async trigger() {
    return this.backupService.triggerBackup();
  }

  @Get('list')
  @ApiOperation({ summary: 'List available backups' })
  async list() {
    return this.backupService.listBackups();
  }

  @Post('restore/:filename')
  @ApiOperation({ summary: 'Restore from a specific backup' })
  async restore(@Param('filename') filename: string) {
    return this.backupService.restoreBackup(filename);
  }
}
