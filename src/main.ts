import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateEnvironment } from './config/env.validation';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 1. Fail-fast environment validation
  const env = validateEnvironment();
  logger.log(`Environment validated successfully. [Mode: ${env.NODE_ENV}]`);

  // 2. Create NestJS application
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // 3. Configure CORS
  app.enableCors({
    origin: env.CORS_ORIGIN || true,
    credentials: true,
  });

  // 4. Request body size limits
  app.use('/maintenance/restore', json({ limit: '50mb' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // 5. Global validation pipe — validates and transforms DTOs
  app.useGlobalPipes(new GlobalValidationPipe());

  // 6. Global exception filter — standardized error responses without leaking internals
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 7. Global interceptors — response envelope + request logging
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  // 8. Start listening on validated port
  await app.listen(env.PORT);
  logger.log(`Medingen Pharmacy Backend running on port ${env.PORT}`);
}

bootstrap().catch((err) => {
  console.error('[FATAL] Backend failed to start:', err.message || err);
  process.exit(1);
});
