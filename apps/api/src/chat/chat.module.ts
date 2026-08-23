import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { ContextModule } from '../context/context.module.js';
import { IntelligenceModule } from '../intelligence/intelligence.module.js';

@Module({
  imports: [ContextModule, IntelligenceModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
