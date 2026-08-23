import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ActivityService } from './activity.service.js';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

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
}
