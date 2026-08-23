import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { STTService } from './stt.service.js';
import { TTSService } from './tts.service.js';
import { ChatService } from '../chat/chat.service.js';
import { IsString, IsOptional } from 'class-validator';

class TranscribeDto {
  @IsString()
  audioBase64!: string;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

class SynthesizeDto {
  @IsString()
  text!: string;

  @IsString()
  @IsOptional()
  voiceId?: string;
}

class VoiceMessageDto {
  @IsString()
  audioBase64!: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

@ApiTags('Voice')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('voice')
export class VoiceController {
  constructor(
    private stt: STTService,
    private tts: TTSService,
    private chatService: ChatService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available voice providers and status' })
  async getProviders() {
    return {
      stt: {
        provider: this.stt.getProvider(),
        available: this.stt.isAvailable(),
      },
      tts: {
        provider: this.tts.getProvider(),
        available: this.tts.isAvailable(),
      },
    };
  }

  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe audio to text (STT)' })
  async transcribe(@Body() dto: TranscribeDto) {
    if (!this.stt.isAvailable()) {
      throw new HttpException('STT provider not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const audioBuffer = Buffer.from(dto.audioBase64, 'base64');
    const result = await this.stt.transcribe(audioBuffer, dto.mimeType);

    return {
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      duration: result.duration,
    };
  }

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize text to speech (TTS)' })
  async synthesize(@Body() dto: SynthesizeDto) {
    if (!this.tts.isAvailable()) {
      throw new HttpException('TTS provider not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const result = await this.tts.synthesize(dto.text, dto.voiceId);

    return {
      audioBase64: result.audioBuffer.toString('base64'),
      mimeType: result.mimeType,
      duration: result.duration,
    };
  }

  @Post('message')
  @ApiOperation({ summary: 'Send voice message — transcribe audio, process through Helm, return response' })
  async voiceMessage(@Body() dto: VoiceMessageDto, @Request() req: any) {
    if (!this.stt.isAvailable()) {
      throw new HttpException('STT provider not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 1. Transcribe audio
    const audioBuffer = Buffer.from(dto.audioBase64, 'base64');
    const transcription = await this.stt.transcribe(audioBuffer);

    if (!transcription.text.trim()) {
      throw new HttpException('No speech detected in audio', HttpStatus.BAD_REQUEST);
    }

    // 2. Process through chat
    const result = await this.chatService.processMessage(
      req.user.id,
      transcription.text,
      dto.sessionId,
    );

    // 3. Optionally synthesize response
    let audioResponse: string | undefined;
    if (this.tts.isAvailable()) {
      try {
        const ttsResult = await this.tts.synthesize(result.message.content);
        audioResponse = ttsResult.audioBuffer.toString('base64');
      } catch (err) {
        // TTS failure is non-critical
      }
    }

    return {
      transcription: transcription.text,
      message: result.message,
      sessionId: result.sessionId,
      spawnedTasks: result.spawnedTasks,
      audioResponse,
    };
  }
}
