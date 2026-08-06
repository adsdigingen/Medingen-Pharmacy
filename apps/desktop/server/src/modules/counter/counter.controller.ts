import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { CounterService } from './counter.service';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { CheckoutCounterDto } from './dto/checkout-counter.dto';
import { AdjustCounterDto } from './dto/adjust-counter.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('counter')
export class CounterController {
  constructor(private readonly counterService: CounterService) {}

  @Post('transfer')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async transfer(@Body() dto: TransferStockDto, @Request() req: any) {
    return this.counterService.transferToCounter(dto, req.user?.username);
  }

  @Get('products')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  async getProducts(
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.counterService.getCounterProducts({
      search,
      lowStock,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('adjust')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async adjust(@Body() dto: AdjustCounterDto, @Request() req: any) {
    return this.counterService.adjustCounterStock(dto, req.user?.username);
  }

  @Get('history/:productId/:batchId')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async getHistory(@Param('productId') productId: string, @Param('batchId') batchId: string) {
    return this.counterService.getCounterHistory(productId, batchId);
  }

  @Post('checkout')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  async checkout(@Body() dto: CheckoutCounterDto, @Request() req: any) {
    return this.counterService.checkoutCounter(
      dto,
      req.user?.id || 'default-cashier-id',
      req.user?.username || 'CASHIER'
    );
  }

  @Get('sales')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  async getSales(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.counterService.getCounterSales({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('print/:saleId')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST, Role.CASHIER)
  async print(@Param('saleId') saleId: string, @Query('width') width?: '58mm' | '80mm' | '150x95mm') {
    return this.counterService.printReceiptText(saleId, width);
  }

  // Reports Endpoints
  @Get('reports/transfers')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getTransferReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.counterService.getTransferReport({ startDate, endDate });
  }

  @Get('reports/sales')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.counterService.getSalesReport({ startDate, endDate });
  }

  @Get('reports/collection')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getDailyCollectionReport(@Query('date') date?: string) {
    return this.counterService.getDailyCollectionReport({ date });
  }

  @Get('reports/stock')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getStockReport() {
    return this.counterService.getStockReport();
  }

  @Get('reports/low-stock')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getLowStockReport() {
    return this.counterService.getLowStockReport();
  }

  @Get('reports/profit')
  @Roles(Role.ADMIN, Role.STORE_MANAGER)
  async getProfitReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.counterService.getProfitReport({ startDate, endDate });
  }
}
