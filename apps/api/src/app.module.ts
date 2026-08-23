import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { FounderModule } from './founder/founder.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AgentModule } from './agent/agent.module.js';
import { TaskModule } from './task/task.module.js';
import { EventModule } from './event/event.module.js';
import { ApprovalModule } from './approval/approval.module.js';
import { ConnectorModule } from './connector/connector.module.js';
import { ContextModule } from './context/context.module.js';
import { OrchestratorModule } from './orchestrator/orchestrator.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { QueueModule } from './queue/queue.module.js';
import { VoiceModule } from './voice/voice.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    QueueModule,
    VoiceModule,
    AuthModule,
    FounderModule,
    ChatModule,
    AgentModule,
    TaskModule,
    EventModule,
    ApprovalModule,
    ConnectorModule,
    ContextModule,
    OrchestratorModule,
    ActivityModule,
  ],
})
export class AppModule {}
