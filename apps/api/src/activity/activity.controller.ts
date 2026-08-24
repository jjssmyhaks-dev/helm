import { Controller, Get, Param, Query, UseGuards, Request, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { ActivityService } from './activity.service.js';
import { ActivitySSEService } from './activity-sse.service.js';
import { Observable } from 'rxjs';

@ApiTags('Activity')
@UseGuards(ClerkGuard)
@Controller('activity')
export class ActivityController {
  constructor(
    private activityService: ActivityService,
    private activitySSE: ActivitySSEService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get recent activity feed across all agents' })
  async getRecentActivity(@Request() req: any, @Query('limit') limit?: string) {
    return this.activityService.getRecentActivity(req.user.id, limit ? parseInt(limit) : 50);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get activity for a specific agent' })
  async getActivityByAgent(
    @Param('agentId') agentId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getActivityByAgent(agentId, req.user.id, limit ? parseInt(limit) : 20);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream for real-time agent activity' })
  streamActivity(@Request() req: any): Observable<any> {
    return this.activitySSE.getStream(req.user.id);
  }
}
