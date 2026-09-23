import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

/**
 * Transforms all controller responses into a standardized envelope format.
 * Automatically detects paginated responses (items + total) and adds meta.
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    return next.handle().pipe(
      map((data) => {
        const timestamp = new Date().toISOString();

        // Check if data is already a Buffer (file download) — pass through
        if (Buffer.isBuffer(data)) {
          return data as any;
        }

        // Detect paginated response shape
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'total' in data
        ) {
          const { items, total, page, limit, totalPages, ...rest } = data;
          return {
            success: true,
            message: 'OK',
            data: items,
            meta: {
              total,
              page,
              limit,
              totalPages,
              ...rest,
            },
            timestamp,
            requestId,
          };
        }

        // Detect integration direct response shape (e.g. Medingen bill creation or settings)
        if (
          data &&
          typeof data === 'object' &&
          (('orderId' in data && 'invoiceId' in data) ||
            'configured' in data ||
            'apiKey' in data ||
            (typeof data.message === 'string' &&
              data.message.toLowerCase().includes('api key')))
        ) {
          return {
            ...data,
            timestamp,
            requestId,
          };
        }

        return {
          success: true,
          message: 'OK',
          data,
          timestamp,
          requestId,
        };
      }),
    );
  }
}
