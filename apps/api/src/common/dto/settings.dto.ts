import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAutonomySettingsDto {
  @ApiPropertyOptional({ description: 'Per-layer autonomy settings' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, { tier: string; enabled: boolean }>;
}

export class UpdateProfileDto {
  @IsOptional() name?: string;
  @IsOptional() businessName?: string;
  @IsOptional() industry?: string;
  @IsOptional() businessType?: string;
}
