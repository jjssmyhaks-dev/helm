import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service.js';
import { IsString, IsOptional } from 'class-validator';

class SendMessageDto {
  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

class SendVoiceDto {
  @IsString()
  transcript!: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a text message to Helm' })
  async sendMessage(@Body() dto: SendMessageDto, @Request() req: any) {
    return this.chatService.processMessage(req.user.id, dto.content, dto.sessionId);
  }

  @Post('voice')
  @ApiOperation({ summary: 'Send a voice message (STT transcript) to Helm' })
  async sendVoice(@Body() dto: SendVoiceDto, @Request() req: any) {
    return this.chatService.processVoice(req.user.id, dto.transcript, dto.sessionId);
  }

  @Get('history/:sessionId')
  @ApiOperation({ summary: 'Get chat history for a session' })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getHistory(req.user.id, sessionId, limit ? parseInt(limit) : 50);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List all chat sessions' })
  async listSessions(@Request() req: any) {
    return this.chatService.listSessions(req.user.id);
  }
}
