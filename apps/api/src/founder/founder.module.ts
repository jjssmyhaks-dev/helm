import { Module } from '@nestjs/common';
import { FounderService } from './founder.service.js';
import { FounderController } from './founder.controller.js';

@Module({
  controllers: [FounderController],
  providers: [FounderService],
  exports: [FounderService],
})
export class FounderModule {}
