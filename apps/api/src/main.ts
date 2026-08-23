import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3456'],
    credentials: true,
  });

  await app.listen(4000);
  console.log('Helm API running on http://localhost:4000');
}

bootstrap().catch(console.error);
