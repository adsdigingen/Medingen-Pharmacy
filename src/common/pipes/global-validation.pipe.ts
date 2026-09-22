import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

/**
 * Enterprise-grade global validation pipe.
 * Transforms payloads, strips unknown properties, and returns structured validation errors.
 */
export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = GlobalValidationPipe.flattenErrors(errors);
        return new BadRequestException({
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    });
  }

  private static flattenErrors(
    errors: ValidationError[],
    parentField = '',
  ): Array<{ field: string; errors: string[] }> {
    const result: Array<{ field: string; errors: string[] }> = [];

    for (const error of errors) {
      const fieldName = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      if (error.constraints) {
        result.push({
          field: fieldName,
          errors: Object.values(error.constraints),
        });
      }

      if (error.children && error.children.length > 0) {
        result.push(
          ...GlobalValidationPipe.flattenErrors(error.children, fieldName),
        );
      }
    }

    return result;
  }
}
