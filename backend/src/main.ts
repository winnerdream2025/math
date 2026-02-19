import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── Pre-flight checks ──────────────────────────────
  if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('dev-secret'))) {
    logger.error('FATAL: JWT_SECRET must be set to a strong value in production');
    process.exit(1);
  }
  if (isProd && (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.startsWith('dev-secret'))) {
    logger.error('FATAL: JWT_REFRESH_SECRET must be set to a strong value in production');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL not set — using local default credentials.');
  }

  // ── Global prefix ──────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Security headers (helmet) ──────────────────────
  app.use(helmet.default());

  // ── CORS — strict in production, permissive in dev ─
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim());
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  // ── Global pipes / filters / interceptors ──────────
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Health-check (outside global prefix) ───────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Swagger — disabled in production ───────────────
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Math & Fils Timesheet API')
      .setDescription('Timesheet Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Graceful shutdown ──────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Server running on port ${port} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  if (!isProd) {
    logger.log(`API:     http://localhost:${port}/api/v1`);
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
    logger.log(`Health:  http://localhost:${port}/health`);
  }
}

bootstrap();
