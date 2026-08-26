import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { ContextModule } from '../context/context.module.js';
import { IntelligenceModule } from '../intelligence/intelligence.module.js';
import { LeadModule } from '../lead/lead.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [ContextModule, IntelligenceModule, LeadModule, EmailModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
