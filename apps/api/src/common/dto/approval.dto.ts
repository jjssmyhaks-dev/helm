import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDto {
  @ApiPropertyOptional({ description: 'Optional reason for approval' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class RejectDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class EditAndApproveDto {
  @ApiProperty({ description: 'Edited action payload' })
  editedPayload!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
