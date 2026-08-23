import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TokenBudgetService } from './token-budget.service.js';
import { RateLimiterService } from './rate-limiter.service.js';

@ApiTags('Budget & Limits')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('budget')
export class QueueController {
  constructor(
    private tokenBudget: TokenBudgetService,
    private rateLimiter: RateLimiterService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get token budget status across all layers' })
  async getBudgets(@Request() req: any) {
    return this.tokenBudget.getAllBudgets(req.user.id);
  }

  @Get('llm-usage')
  @ApiOperation({ summary: 'Get LLM rate limit usage' })
  async getLlmUsage(@Request() req: any) {
    return {
      hourly: await this.rateLimiter.getUsage('llm:founder'),
      perMinute: await this.rateLimiter.getUsage('llm:founder:minute'),
    };
  }
}
