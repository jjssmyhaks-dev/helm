import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventBusService } from './event-bus.service.js';
import { EventController } from './event.controller.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: 'signal-processing' }),
  ],
  controllers: [EventController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventModule {}
