import { Module } from '@nestjs/common';
import { ConnectorService } from './connector.service.js';
import { ConnectorController } from './connector.controller.js';

@Module({
  controllers: [ConnectorController],
  providers: [ConnectorService],
  exports: [ConnectorService],
})
export class ConnectorModule {}
