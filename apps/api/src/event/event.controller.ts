import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { EventBusService } from './event-bus.service.js';

@ApiTags('Events')
@UseGuards(ClerkGuard)
@Controller('events')
export class EventController {
  constructor(private eventBus: EventBusService) {}

  @Get('recent')
  @ApiOperation({ summary: 'Get recent event signals for the founder' })
  async getRecentEvents(@Request() req: any) {
    return this.eventBus.getRecentEvents(req.user.id);
  }

  @Get('subscriptions/:signalType')
  @ApiOperation({ summary: 'Get all subscribers for a signal type' })
  async getSubscribers(
    @Request() req: any,
    @Param('signalType') signalType: string,
  ) {
    return this.eventBus.getSubscribers(req.user.id, signalType);
  }
}
