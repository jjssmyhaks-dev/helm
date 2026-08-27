import { Module } from '@nestjs/common';
import { EmailController } from './email.controller.js';
import { EmailService } from './email.service.js';
import { EmailRagService } from './email-rag.service.js';
import { LLMService } from '../llm/llm.service.js';

@Module({
  controllers: [EmailController],
  providers: [EmailService, EmailRagService, LLMService],
  exports: [EmailService],
})
export class EmailModule {}
