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
  getState(@Request() req: any) {
    const question = this.onboardingService.getCurrentQuestion(req.user.id);
    const state = this.onboardingService.getState(req.user.id);
    return {
      ...question,
      completed: state.completed,
      answers: state.answers,
    };
  }

  @Post('answer')
  @ApiOperation({ summary: 'Submit answer to current onboarding question' })
  async submitAnswer(@Body() dto: SubmitAnswerDto, @Request() req: any) {
    return this.onboardingService.submitAnswer(req.user.id, dto.answer);
  }

  @Post('skip')
  @ApiOperation({ summary: 'Skip onboarding' })
  skip(@Request() req: any) {
    this.onboardingService.skipOnboarding(req.user.id);
    return { status: 'skipped' };
  }
}
