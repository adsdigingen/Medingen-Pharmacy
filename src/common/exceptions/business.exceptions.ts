import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all business logic exceptions.
 */
export class BusinessException extends HttpException {
  public readonly errorCode: string;

  constructor(message: string, errorCode: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode;
  }
}

export class InsufficientStockException extends BusinessException {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Insufficient stock for "${productName}". Requested: ${requested}, Available: ${available}.`,
      'INSUFFICIENT_STOCK',
      HttpStatus.CONFLICT,
    );
  }
}

export class DuplicateEntityException extends BusinessException {
  constructor(entityName: string, field: string, value: string) {
    super(
      `${entityName} with ${field} "${value}" already exists.`,
      'DUPLICATE_ENTITY',
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidBatchException extends BusinessException {
  constructor(batchId: string, reason: string) {
    super(
      `Batch "${batchId}" is invalid: ${reason}`,
      'INVALID_BATCH',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ExpiredBatchException extends BusinessException {
  constructor(batchNumber: string, expiryDate: Date) {
    super(
      `Batch "${batchNumber}" expired on ${expiryDate.toISOString().slice(0, 10)}. Cannot sell expired products.`,
      'EXPIRED_BATCH',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EntityNotFoundException extends BusinessException {
  constructor(entityName: string, id: string) {
    super(
      `${entityName} with ID "${id}" not found.`,
      'ENTITY_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SyncFailedException extends BusinessException {
  constructor(reason: string) {
    super(
      `Sync operation failed: ${reason}`,
      'SYNC_FAILED',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class InvalidOperationException extends BusinessException {
  constructor(message: string) {
    super(message, 'INVALID_OPERATION', HttpStatus.BAD_REQUEST);
  }
}

export class AuthenticationException extends BusinessException {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_REQUIRED', HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationException extends BusinessException {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'AUTHORIZATION_DENIED', HttpStatus.FORBIDDEN);
  }
}
