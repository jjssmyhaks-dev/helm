import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service.js';
import { EventController } from './event.controller.js';

@Global()
@Module({
  controllers: [EventController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventModule {}
