/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app/app.module';
import { typeormConfig } from './typeorm.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;

  let origin: string | string[];
  if (corsOrigin) {
    origin = corsOrigin.split(',').map((value) => value.trim());
  } else if (isProduction) {
    origin = [];
    Logger.warn('⚠️  CORS_ORIGIN not set in production - CORS is disabled. Set CORS_ORIGIN to allow specific origins.');
  } else {
    origin = '*';
  }

  app.enableCors({
    origin,
    credentials: origin !== '*' && Array.isArray(origin) && origin.length > 0,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  if (Array.isArray(origin) && origin.length > 0) {
    Logger.log(`🌐 CORS enabled with restricted origins: ${origin.join(', ')}`);
  } else if (origin === '*') {
    Logger.log('🌐 CORS enabled with origin: * (all origins allowed - development mode)');
  } else {
    Logger.log('🌐 CORS disabled (no origins allowed)');
  }

  if (!typeormConfig.synchronize && typeormConfig.migrations?.length) {
    const dataSource = app.get(DataSource);
    try {
      Logger.log('🔄 Running pending migrations...');
      await dataSource.runMigrations();
      Logger.log('✅ Migrations completed successfully');
    } catch (error) {
      Logger.error('❌ Failed to run migrations:', error);
      throw error;
    }
  } else if (typeormConfig.synchronize) {
    Logger.log('ℹ️  Schema synchronization enabled - migrations skipped');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = parseInt(process.env.PORT || '3200', 10);
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
