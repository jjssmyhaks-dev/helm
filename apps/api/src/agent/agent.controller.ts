import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { AgentService } from './agent.service.js';

@ApiTags('Agents')
@UseGuards(ClerkGuard)
@Controller('agents')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: 'List all agents with live status' })
  @ApiQuery({ name: 'layer', required: false })
  async listAgents(@Request() req: any, @Query('layer') layer?: string) {
    return this.agentService.listAgents(req.user.id, layer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent details' })
  async getAgent(@Param('id') id: string, @Request() req: any) {
    return this.agentService.getAgent(id, req.user.id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get activity feed for a specific agent' })
  async getAgentActivity(
    @Param('id') id: string,
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.agentService.getAgentActivity(
      id,
      req.user.id,
      limit ? parseInt(limit) : 20,
    );
  }
}
