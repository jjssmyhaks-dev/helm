import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingController } from './onboarding.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { ContextModule } from '../context/context.module.js';

@Module({
  imports: [DatabaseModule, LLMModule, ContextModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
