import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            id: req.id,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
          err: (err) => ({
            type: err.type,
            message: err.message,
            stack: err.stack,
          }),
        },
        redact: ['req.headers.authorization', 'req.headers["x-founder-id"]', 'password', 'token', 'secret'],
      },
    }),
  ],
})
export class LoggerConfigModule {}
