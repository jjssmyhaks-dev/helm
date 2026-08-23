import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { OrchestratorModule } from '../orchestrator/orchestrator.module.js';
import { ContextModule } from '../context/context.module.js';

@Module({
  imports: [OrchestratorModule, ContextModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
