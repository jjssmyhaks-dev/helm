import { Module } from '@nestjs/common';
import { ComposioService } from './composio.service.js';
import { ConnectorController } from './connector.controller.js';

@Module({
  controllers: [ConnectorController],
  providers: [ComposioService],
  exports: [ComposioService],
})
export class ConnectorModule {}
