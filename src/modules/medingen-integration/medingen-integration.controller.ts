import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MedingenIntegrationService } from './medingen-integration.service';
import { CreateMedingenBillDto } from './dto/create-medingen-bill.dto';
import { MedingenApiGuard } from './guards/medingen-api.guard';
import { MedingenBillSuccessResponse } from './types/medingen.types';
import type { Request } from 'express';

@UseGuards(MedingenApiGuard)
@Controller(['api/integration/medingen', 'integration/medingen'])
export class MedingenIntegrationController {
  constructor(
    private readonly medingenIntegrationService: MedingenIntegrationService,
  ) {}

  /**
   * Headless Medingen API Order Billing Endpoint.
   * Server-to-server authenticated via Bearer token (MEDINGEN_API_KEY).
   * Validates products, resolves customer, executes checkout via existing BillingService,
   * enforces idempotency, logs audit trail, and returns generated invoice data.
   */
  @Post('bills')
  @HttpCode(HttpStatus.OK)
  async createBill(
    @Body() dto: CreateMedingenBillDto,
    @Req() req: Request,
  ): Promise<MedingenBillSuccessResponse> {
    const requestId = (req as any).requestId || undefined;
    return this.medingenIntegrationService.createBill(dto, requestId);
  }
}
