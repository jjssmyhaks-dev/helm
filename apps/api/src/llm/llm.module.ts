import { Module, Global } from '@nestjs/common';
import { LLMService } from './llm.service.js';

@Global()
@Module({
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
