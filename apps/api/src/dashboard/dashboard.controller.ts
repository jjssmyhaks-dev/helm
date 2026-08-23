import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get full dashboard data' })
  async getDashboard(@Request() req: any) {
    return this.dashboardService.getDashboard(req.user.id);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get agent performance stats' })
  async getAgentStats(@Request() req: any) {
    return this.dashboardService.getAgentStats(req.user.id);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get task statistics' })
  async getTaskStats(@Request() req: any) {
    return this.dashboardService.getTaskStats(req.user.id);
  }
}
