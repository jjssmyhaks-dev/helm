import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FounderService } from './founder.service.js';
import { IsObject, IsString, IsOptional } from 'class-validator';

class UpdateAutonomyDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessDescription?: string;
}

@ApiTags('Founder')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('founder')
export class FounderController {
  constructor(private founderService: FounderService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get founder profile' })
  async getProfile(@Request() req: any) {
    return this.founderService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update founder profile' })
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    return this.founderService.updateProfile(req.user.id, dto);
  }

  @Patch('autonomy-settings')
  @ApiOperation({ summary: 'Update per-layer risk tier overrides' })
  async updateAutonomy(@Body() dto: UpdateAutonomyDto, @Request() req: any) {
    return this.founderService.updateAutonomySettings(req.user.id, dto.settings);
  }
}
