import { Controller, Get, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Request() req: any) {
    const founderId = req.user?.id || req.headers['x-founder-id'] || 'system';
    return this.dashboardService.getDashboard(founderId);
  }

  @Get('agents')
  async getAgentStats(@Request() req: any) {
    const founderId = req.user?.id || req.headers['x-founder-id'] || 'system';
    return this.dashboardService.getAgentStats(founderId);
  }

  @Get('tasks')
  async getTaskStats(@Request() req: any) {
    const founderId = req.user?.id || req.headers['x-founder-id'] || 'system';
    return this.dashboardService.getTaskStats(founderId);
  }
}
