import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

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
