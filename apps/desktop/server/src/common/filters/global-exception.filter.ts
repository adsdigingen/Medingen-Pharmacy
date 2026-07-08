import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exceptions';

/**
 * Centralized exception filter that handles all exception types
 * and returns standardized error responses.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || 'unknown';
    const timestamp = new Date().toISOString();

    let status: number;
    let message: string;
    let errorCode: string;
    let errors: any[] | undefined;

    if (exception instanceof BusinessException) {
      // Domain-specific business errors
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      message = body.message || exception.message;
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      // Standard NestJS HTTP exceptions
      status = exception.getStatus();
      const body = exception.getResponse() as any;

      if (typeof body === 'string') {
        message = body;
        errorCode = 'HTTP_ERROR';
      } else {
        message = body.message || exception.message;
        errorCode = body.errorCode || 'HTTP_ERROR';
        errors = body.errors;
      }
    } else if (exception instanceof Error) {
      // Prisma client errors
      if (exception.constructor.name === 'PrismaClientKnownRequestError') {
        status = HttpStatus.BAD_REQUEST;
        const prismaError = exception as any;
        errorCode = 'DATABASE_ERROR';

        switch (prismaError.code) {
          case 'P2002':
            message = `Duplicate value for unique field: ${prismaError.meta?.target?.join(', ') || 'unknown'}`;
            break;
          case 'P2003':
            message = 'Foreign key constraint violation';
            break;
          case 'P2025':
            status = HttpStatus.NOT_FOUND;
            message = 'Record not found';
            break;
          default:
            message = `Database error: ${prismaError.code}`;
        }
      } else if (
        exception.constructor.name === 'PrismaClientValidationError'
      ) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid query parameters';
        errorCode = 'DATABASE_VALIDATION_ERROR';
      } else {
        // Unknown application errors
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'An unexpected error occurred';
        errorCode = 'INTERNAL_ERROR';
        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack,
        );
      }
    } else {
      // Completely unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      errorCode = 'UNKNOWN_ERROR';
      this.logger.error('Unknown exception type:', exception);
    }

    const errorResponse = {
      success: false,
      message,
      errorCode,
      ...(errors ? { errors } : {}),
      timestamp,
      requestId,
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
