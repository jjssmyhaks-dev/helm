import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // Initialize Sentry if DSN is configured
  if (process.env.SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
    } catch {
      // Sentry init failed, continue without it
    }
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS — allow all common dev ports + production
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3456',
      'http://localhost:52273',
      process.env.FRONTEND_URL || '',
    ].filter((o): o is string => !!o),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Swagger API docs — wrapped in try/catch
  try {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('Helm API')
      .setDescription('AI Operating System for Solo Founders — API')
      .setVersion('0.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    new Logger('Bootstrap').log('Swagger docs at http://localhost:4000/docs');
  } catch {
    // Swagger not available, skip
  }

  // Global prefix for all routes — health endpoint excluded since it's already at /api/health
  app.setGlobalPrefix('api', { exclude: ['api/health'] });

  await app.listen(4000);
  new Logger('Bootstrap').log('Helm API running on http://localhost:4000');
}

bootstrap().catch((err) => {
  console.error('Failed to start Helm API:', err);
  process.exit(1);
});
