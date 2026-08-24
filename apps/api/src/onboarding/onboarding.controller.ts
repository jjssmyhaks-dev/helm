import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { OnboardingService } from './onboarding.service.js';
import { IsString } from 'class-validator';

class SubmitAnswerDto {
  @IsString()
  answer!: string;
}

@ApiTags('Onboarding')
@UseGuards(ClerkGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current onboarding state and question' })
  async getState(@Request() req: any) {
    const question = await this.onboardingService.getCurrentQuestion(req.user.id);
    return {
      step: question.step,
      progress: question.progress,
      greeting: question.greeting,
      completed: question.progress === 100,
      answers: question.answers,
    };
  }

  @Post('answer')
  @ApiOperation({ summary: 'Submit answer to current onboarding question' })
  async submitAnswer(@Body() dto: SubmitAnswerDto, @Request() req: any) {
    return this.onboardingService.submitAnswer(req.user.id, dto.answer);
  }

  @Post('skip')
  @ApiOperation({ summary: 'Skip onboarding' })
  async skip(@Request() req: any) {
    await this.onboardingService.skipOnboarding(req.user.id);
    return { status: 'skipped' };
  }
}
