import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service.js';
import { VoiceController } from './voice.controller.js';

@Module({
  providers: [VoiceService],
  controllers: [VoiceController],
  exports: [VoiceService],
})
export class VoiceModule {}
