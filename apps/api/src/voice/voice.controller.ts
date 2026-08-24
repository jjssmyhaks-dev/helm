import { Controller, Post, Get, Body, Req, Res } from '@nestjs/common';
import { VoiceService } from './voice.service.js';

@Controller('voice')
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  @Post('transcribe')
  async transcribe(@Body() body: { audio: string; mimeType?: string }, @Req() req: any) {
    // Accept base64 audio from frontend
    const audioBuffer = Buffer.from(body.audio, 'base64');
    const result = await this.voiceService.transcribe(audioBuffer, body.mimeType || 'audio/webm');
    return result;
  }

  @Post('synthesize')
  async synthesize(
    @Body() body: { text: string; voiceId?: string },
    @Res() res: any,
  ) {
    const result = await this.voiceService.synthesize(body.text, body.voiceId);
    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.audio.length,
    });
    res.send(result.audio);
  }

  @Get('voices')
  async listVoices() {
    return this.voiceService.listVoices();
  }

  @Get('health')
  async health() {
    return this.voiceService.healthCheck();
  }
}
