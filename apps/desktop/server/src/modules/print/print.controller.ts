import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrintService } from './print.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(AuthGuard, RolesGuard)
@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get(':billId')
  async getReceiptText(
    @Param('billId') billId: string,
    @Query('width') width?: '58mm' | '80mm' | '150x95mm',
  ) {
    const text = await this.printService.generateReceiptText(billId, width || '80mm');
    return { text };
  }
}
