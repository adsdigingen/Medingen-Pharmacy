import { Controller, Get, Post, Body, Param, Delete, Query, Put, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CheckoutBillDto, HoldBillDto, SalesReturnDto } from './dto/checkout-bill.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(AuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  checkout(@Body() checkoutBillDto: CheckoutBillDto) {
    return this.billingService.checkout(checkoutBillDto);
  }

  @Post('hold')
  holdBill(@Body() holdBillDto: HoldBillDto) {
    return this.billingService.holdBill(holdBillDto);
  }

  @Get('hold')
  getHoldBills() {
    return this.billingService.getHoldBills();
  }

  @Delete('hold/:id')
  deleteHoldBill(@Param('id') id: string) {
    return this.billingService.deleteHoldBill(id);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.findAll({
      search,
      paymentMethod,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Put(':id/cancel')
  cancelBill(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.billingService.cancelBill(id, reason || 'Cancelled by Cashier');
  }

  @Post('return')
  salesReturn(@Body() salesReturnDto: SalesReturnDto) {
    return this.billingService.salesReturn(salesReturnDto);
  }
}
