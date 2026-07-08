import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { SyncStatus } from '@medingen/db';

@Injectable()
export class LedgerListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('inventory.adjusted')
  async handleStockAdjustmentLedger(event: any) {
    // Ledger entry for adjustments is already created within the transaction for database integrity.
    // We log listener verification.
  }
}
