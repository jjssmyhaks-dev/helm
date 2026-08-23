import { Module } from '@nestjs/common';
import { STTService } from './stt.service.js';
import { TTSService } from './tts.service.js';
import { VoiceController } from './voice.controller.js';

@Module({
  controllers: [VoiceController],
  providers: [STTService, TTSService],
  exports: [STTService, TTSService],
})
export class VoiceModule {}
