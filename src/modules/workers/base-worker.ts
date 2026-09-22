import { Logger } from '@nestjs/common';

export abstract class BaseWorker {
  protected readonly logger: Logger;
  public enabled = true;
  public isExecuting = false;
  public lastExecutedAt: Date | null = null;
  public lastExecutionDurationMs: number | null = null;
  public lastError: string | null = null;

  constructor(public readonly name: string) {
    this.logger = new Logger(name);
  }

  async execute(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Worker execution skipped (disabled)');
      return;
    }
    if (this.isExecuting) {
      this.logger.warn('Worker is already executing');
      return;
    }

    this.isExecuting = true;
    const start = Date.now();
    try {
      this.logger.debug('Starting execution...');
      await this.run();
      this.lastError = null;
      this.logger.debug(`Execution completed successfully in ${Date.now() - start}ms`);
    } catch (e: any) {
      this.lastError = e.message;
      this.logger.error(`Execution failed: ${e.message}`, e.stack);
    } finally {
      this.isExecuting = false;
      this.lastExecutedAt = new Date();
      this.lastExecutionDurationMs = Date.now() - start;
    }
  }

  public toggle(enabled: boolean) {
    this.enabled = enabled;
    this.logger.log(`Worker has been ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  protected abstract run(): Promise<void>;
}
