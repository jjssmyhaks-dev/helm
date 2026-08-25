import { Injectable, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service.js';

@Module({
  imports: [ScheduleModule],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
