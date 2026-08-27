import { Module } from '@nestjs/common';
import { LeadController } from './lead.controller.js';
import { LeadService } from './lead.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import { LLMService } from '../llm/llm.service.js';

@Module({
  controllers: [LeadController],
  providers: [LeadService, LeadScoringService, LLMService],
  exports: [LeadService],
})
export class LeadModule {}
