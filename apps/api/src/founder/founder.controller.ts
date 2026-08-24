import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import { FounderService } from './founder.service.js';
import { SettingsService } from './settings.service.js';

@Controller('founder')
export class FounderController {
  constructor(
    private founderService: FounderService,
    private settingsService: SettingsService,
  ) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.founderService.getProfile(req.user?.id || '');
  }

  @Patch('profile')
  async updateProfile(@Body() dto: { name?: string; businessName?: string; industry?: string; businessType?: string }, @Request() req: any) {
    return this.founderService.updateProfile(req.user?.id || '', dto);
  }

  @Get('autonomy-settings')
  async getAutonomySettings(@Request() req: any) {
    return this.settingsService.getAutonomySettings(req.user?.id || '');
  }

  @Patch('autonomy-settings')
  async updateAutonomySettings(@Body() settings: Record<string, any>, @Request() req: any) {
    return this.settingsService.updateAutonomySettings(req.user?.id || '', settings);
  }
}
