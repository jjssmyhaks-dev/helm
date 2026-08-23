import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('api/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      api: 'running',
      version: '0.1.0',
    };
  }
}
