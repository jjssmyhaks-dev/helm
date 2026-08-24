import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content from the founder' })
  @IsString()
  @MaxLength(10000)
  content!: string;

  @ApiPropertyOptional({ description: 'Existing session ID to continue' })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class SendVoiceDto {
  @ApiProperty({ description: 'Transcribed text from voice input' })
  @IsString()
  @MaxLength(10000)
  transcript!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;
}
