import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FounderService } from './founder.service.js';
import { IsString, IsOptional } from 'class-validator';

class UpdateProfileDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() industry?: string;
  @IsString() @IsOptional() businessType?: string;
}

@ApiTags('Founder')
@ApiBearerAuth()
@Controller('founder')
export class FounderController {
  constructor(private founderService: FounderService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get founder profile' })
  async getProfile(@Request() req: any) {
    return this.founderService.getProfile(req.user?.id || '');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update founder profile' })
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    return this.founderService.updateProfile(req.user?.id || '', dto);
  }
}
