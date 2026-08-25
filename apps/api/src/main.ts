import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './common/sentry.filter.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // Initialize Sentry before anything else
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }

  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable default logger; nestjs-pino handles it
  });

  // Global Sentry exception filter
  app.useGlobalFilters(new SentryFilter());

  // Use Pino as the NestJS logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // CORS — allow all common dev ports + production
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3456',
      'http://localhost:52273',
      process.env.FRONTEND_URL || '',
    ].filter((o): o is string => !!o),
    credentials: true,
  });

  // Global validation pipe — validates all incoming DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Helm API')
    .setDescription('AI Operating System for Solo Founders — API')
    .setVersion('0.1.0')
    .addTag('Auth', 'Clerk authentication')
    .addTag('Chat', 'AI chat with intent routing')
    .addTag('Agents', 'Agent management and status')
    .addTag('Tasks', 'Task queue and execution')
    .addTag('Approvals', 'Tier-3 approval workflow')
    .addTag('Connectors', 'External tool integrations via Composio')
    .addTag('Intelligence', 'Marketing, cashflow, competitor, support engines')
    .addTag('Dashboard', 'Analytics and stats')
    .addTag('Notifications', 'In-app notification system')
    .addTag('Voice', 'STT/TTS via Deepgram + ElevenLabs')
    .addTag('Scheduler', 'Background cron jobs')
    .addTag('Settings', 'Autonomy controls per layer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(4000);
  console.log('Helm API running on http://localhost:4000');
  console.log('Swagger docs at http://localhost:4000/docs');
}

bootstrap().catch(console.error);
