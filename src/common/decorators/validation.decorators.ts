import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates Indian GSTIN format: 2-digit state code + 10-char PAN + 1 entity + Z + checksum
 * Example: 27AABCU9603R1ZM
 */
export function IsGSTIN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGSTIN',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid 15-character GSTIN`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (!value) return true; // Allow optional
          return (
            typeof value === 'string' &&
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
              value,
            )
          );
        },
      },
    });
  };
}

/**
 * Validates Indian mobile number: 10 digits starting with 6-9
 */
export function IsMobileIN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMobileIN',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid 10-digit Indian mobile number`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (!value) return true;
          return typeof value === 'string' && /^[6-9]\d{9}$/.test(value);
        },
      },
    });
  };
}

/**
 * Validates that a numeric value is positive (> 0)
 */
export function IsPositiveAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveAmount',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a positive number`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          return typeof value === 'number' && value > 0;
        },
      },
    });
  };
}

/**
 * Validates batch number format: alphanumeric, 2-20 characters
 */
export function IsBatchNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBatchNumber',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid batch number (2-20 alphanumeric characters)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (!value) return true;
          return (
            typeof value === 'string' && /^[A-Za-z0-9\-\/]{2,20}$/.test(value)
          );
        },
      },
    });
  };
}

/**
 * Validates that a numeric value is non-negative (>= 0)
 */
export function IsNonNegative(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNonNegative',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be zero or a positive number`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          return typeof value === 'number' && value >= 0;
        },
      },
    });
  };
}

/**
 * Validates HSN code format: 4, 6, or 8-digit code
 */
export function IsHSNCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isHSNCode',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid HSN code (4, 6, or 8 digits)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (!value) return true;
          return (
            typeof value === 'string' &&
            /^[0-9]{4}([0-9]{2})?([0-9]{2})?$/.test(value)
          );
        },
      },
    });
  };
}
