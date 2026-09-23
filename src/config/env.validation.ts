export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_SECONDS: number;
  CORS_ORIGIN?: string;
  CLOUD_API_URL?: string;
  MEDINGEN_BILLING_API_KEY?: string;
  MEDINGEN_API_KEY?: string;
}

/**
 * Validates critical environment variables before bootstrapping the application.
 * Fails fast with clear actionable error messages if required settings are missing or unsafe.
 */
export function validateEnvironment(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as
    'development' | 'production' | 'test';
  const port = parseInt(process.env.PORT || '3001', 10);
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const jwtExpirationSeconds = parseInt(
    process.env.JWT_EXPIRATION_SECONDS || '28800',
    10,
  );
  const corsOrigin = process.env.CORS_ORIGIN;
  const cloudApiUrl = process.env.CLOUD_API_URL;

  const errors: string[] = [];

  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(
      `PORT must be a valid port number (1-65535). Received: "${process.env.PORT}"`,
    );
  }

  if (!databaseUrl) {
    errors.push(
      'DATABASE_URL is required but was not provided in the environment.',
    );
  } else if (
    !databaseUrl.startsWith('postgresql://') &&
    !databaseUrl.startsWith('postgres://')
  ) {
    errors.push(
      'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
    );
  }

  if (!jwtSecret) {
    errors.push(
      'JWT_SECRET is required but was not provided in the environment.',
    );
  } else if (jwtSecret.length < 32) {
    errors.push(
      'JWT_SECRET must be a secure high-entropy key of at least 32 characters.',
    );
  } else if (
    jwtSecret.toLowerCase().includes('secret') ||
    jwtSecret.toLowerCase().includes('password') ||
    jwtSecret.toLowerCase().includes('123')
  ) {
    if (nodeEnv === 'production') {
      errors.push(
        'JWT_SECRET contains insecure/common keywords. Use a random high-entropy secret in production.',
      );
    }
  }

  if (errors.length > 0) {
    const errorBanner = [
      '',
      '================================================================================',
      '[FATAL] ENVIRONMENT CONFIGURATION VALIDATION FAILED',
      '================================================================================',
      ...errors.map((e) => `  - ${e}`),
      '================================================================================',
      'Please check your .env configuration and restart the application.',
      '',
    ].join('\n');

    console.error(errorBanner);
    throw new Error('Environment configuration validation failed.');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl!,
    JWT_SECRET: jwtSecret!,
    JWT_EXPIRATION_SECONDS: isNaN(jwtExpirationSeconds)
      ? 28800
      : jwtExpirationSeconds,
    CORS_ORIGIN: corsOrigin,
    CLOUD_API_URL: cloudApiUrl,
    MEDINGEN_BILLING_API_KEY: (
      process.env.MEDINGEN_BILLING_API_KEY || process.env.MEDINGEN_API_KEY
    )?.trim(),
    MEDINGEN_API_KEY: (
      process.env.MEDINGEN_BILLING_API_KEY || process.env.MEDINGEN_API_KEY
    )?.trim(),
  };
}
