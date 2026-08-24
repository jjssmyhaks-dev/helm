import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service.js';
import { ApprovalController } from './approval.controller.js';
import { RiskTierService } from './risk-tier.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { EventModule } from '../event/event.module.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [DatabaseModule, EventModule, NotificationModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, RiskTierService],
  exports: [ApprovalService, RiskTierService],
})
export class ApprovalModule {}
