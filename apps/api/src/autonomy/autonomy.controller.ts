import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutonomyService } from './autonomy.service.js';
import { RiskTier } from '@prisma/client';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('autonomy')
export class AutonomyController {
  constructor(private autonomyService: AutonomyService) {}

  @Get('actions')
  @ApiOperation({ summary: 'Get all action autonomy settings with tiers' })
  async getActions(@Query('founderId') founderId: string) {
    return this.autonomyService.getSettings(founderId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get autonomy summary stats by layer' })
  async getSummary(@Query('founderId') founderId: string) {
    return this.autonomyService.getSummary(founderId);
  }

  @Patch('actions/:layer/:actionId')
  @ApiOperation({ summary: 'Update risk tier for a specific action type' })
  async updateAction(
    @Query('founderId') founderId: string,
    @Param('layer') layer: string,
    @Param('actionId') actionId: string,
    @Body() body: { tier: RiskTier },
  ) {
    await this.autonomyService.updateActionTier(founderId, layer, actionId, body.tier);
    return { success: true };
  }

  @Patch('actions/:layer/:actionId/toggle')
  @ApiOperation({ summary: 'Enable or disable an action type' })
  async toggleAction(
    @Query('founderId') founderId: string,
    @Param('layer') layer: string,
    @Param('actionId') actionId: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.autonomyService.toggleAction(founderId, layer, actionId, body.enabled);
    return { success: true };
  }

  @Patch('layer/:layer')
  @ApiOperation({ summary: 'Set all actions in a layer to the same risk tier' })
  async updateLayer(
    @Query('founderId') founderId: string,
    @Param('layer') layer: string,
    @Body() body: { tier: RiskTier },
  ) {
    await this.autonomyService.updateLayer(founderId, layer, body.tier);
    return { success: true };
  }

  @Get('check/:layer/:actionId')
  @ApiOperation({ summary: 'Check the risk tier for a specific action (used by agents)' })
  async checkAction(
    @Query('founderId') founderId: string,
    @Param('layer') layer: string,
    @Param('actionId') actionId: string,
  ) {
    return this.autonomyService.getActionTier(founderId, layer, actionId);
  }
}
