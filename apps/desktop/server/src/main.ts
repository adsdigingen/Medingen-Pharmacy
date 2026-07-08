import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors();

  app.use('/maintenance/restore', json({ limit: '50mb' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // Global validation pipe — validates all incoming DTOs
  app.useGlobalPipes(new GlobalValidationPipe());

  // Global exception filter — standardized error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors — response envelope + request logging
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

