import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service.js';
import { ApprovalController } from './approval.controller.js';
import { RiskTierService } from './risk-tier.service.js';

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService, RiskTierService],
  exports: [ApprovalService, RiskTierService],
})
export class ApprovalModule {}
