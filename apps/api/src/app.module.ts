import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { LLMModule } from './llm/llm.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health.controller.js';
import { IntelligenceModule } from './intelligence/intelligence.module.js';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    QueueModule,
    VoiceModule,
    LLMModule,
    OnboardingModule,
    SchedulerModule,
    NotificationModule,
    DashboardModule,
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
    IntelligenceModule,
  ],
})
export class AppModule {}
