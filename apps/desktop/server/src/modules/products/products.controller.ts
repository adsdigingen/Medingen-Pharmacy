import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  Patch,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@medingen/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async create(@Body() body: any) {
    const dto = new CreateProductDto();
    dto.name = body.name;
    dto.genericName = body.genericName;
    dto.brandName = body.brandName;
    dto.barcode = body.barcode || undefined;
    dto.sku = body.sku || undefined;
    dto.categoryId = body.categoryId || undefined;
    dto.manufacturerId = body.manufacturerId || undefined;
    dto.supplierId = body.supplierId || undefined;
    dto.hsnCode = body.hsnCode || undefined;
    
    // Parse numeric fields safely
    dto.gstPercentage = body.gstPercentage !== undefined ? Number(body.gstPercentage) : (body.gstRate !== undefined ? Number(body.gstRate) : undefined);
    dto.purchasePrice = body.purchasePrice !== undefined ? Number(body.purchasePrice) : (body.purchaseRate !== undefined ? Number(body.purchaseRate) : undefined);
    dto.retailDiscount = body.discountPercentage !== undefined ? Number(body.discountPercentage) : (body.retailDiscount !== undefined ? Number(body.retailDiscount) : undefined);
    dto.minStockLevel = body.minimumStock !== undefined ? Number(body.minimumStock) : (body.minStockLevel !== undefined ? Number(body.minStockLevel) : undefined);
    dto.mrp = body.mrp !== undefined ? Number(body.mrp) : undefined;
    
    const inputSellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined;
    dto.sellingPrice = inputSellingPrice;
    dto.offlineSellingPrice = inputSellingPrice;
    dto.offlineAutoCalculate = body.offlineAutoCalculate ?? (inputSellingPrice !== undefined ? false : true);
    dto.onlineAutoCalculate = body.onlineAutoCalculate ?? true;
    
    dto.drugSchedule = body.schedule !== undefined ? body.schedule : body.drugSchedule;
    dto.status = body.status !== undefined ? (body.status === 'true' || body.status === true) : undefined;

    const result = await this.productsService.create(dto);
    return {
      ...result,
      discountPercentage: result.retailDiscount,
    };
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('drugSchedule') drugSchedule?: string,
    @Query('medicineClassification') medicineClassification?: string,
    @Query('prescriptionRequired') prescriptionRequired?: string,
    @Query('controlledDrug') controlledDrug?: string,
  ) {
    return this.productsService.findAll({
      search,
      categoryId,
      manufacturerId,
      supplierId,
      status,
      sortBy,
      sortOrder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      drugSchedule,
      medicineClassification,
      prescriptionRequired,
      controlledDrug,
    });
  }

  @Get('template')
  getTemplate(@Res() res: express.Response) {
    const buffer = this.productsService.getImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=products_import_template.xlsx',
    );
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Get('export')
  async export(
    @Query('search') search: string,
    @Query('categoryId') categoryId: string,
    @Query('manufacturerId') manufacturerId: string,
    @Query('supplierId') supplierId: string,
    @Query('status') status: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.productsService.exportProducts({
      search,
      categoryId,
      manufacturerId,
      supplierId,
      status,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=products_export.xlsx',
    );
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Post('import')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  @UseInterceptors(FileInterceptor('file'))
  async importFile(@UploadedFile() file: Express.Multer.File) {
    return this.productsService.importProducts(file.buffer);
  }

  @Post('import/parse')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  @UseInterceptors(FileInterceptor('file'))
  async parseImportFile(@UploadedFile() file: Express.Multer.File) {
    return this.productsService.parseImportFile(file.buffer);
  }

  @Post('import/start')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async startImport(@Body() body: { importId: string; supplierName: string; totalRows: number }) {
    return this.productsService.emitImportStarted(body.importId, body.supplierName, body.totalRows);
  }

  @Post('import/validate')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async validateRows(@Body() body: { rows: any[]; mapping: Record<string, string>; duplicateMode: string }) {
    return this.productsService.validateImportRows(body.rows, body.mapping, body.duplicateMode);
  }

  @Post('import/chunk')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async importChunk(@Body() body: { rows: any[]; mapping: Record<string, string>; duplicateMode: string }) {
    return this.productsService.importChunk(body.rows, body.mapping, body.duplicateMode);
  }

  @Post('import/complete')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async completeImport(@Body() body: { importId: string; supplierName: string; successCount: number; errorCount: number; error?: string }) {
    if (body.error) {
      return this.productsService.emitImportFailed(body.importId, body.supplierName, body.error);
    }
    return this.productsService.emitImportCompleted(body.importId, body.supplierName, body.successCount, body.errorCount);
  }

  @Get('import/mappings')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async getSupplierMappings() {
    return this.productsService.getSupplierMappings();
  }

  @Post('import/mappings')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  async saveSupplierMapping(@Body() body: { supplierName: string; mapping: any }) {
    return this.productsService.saveSupplierMapping(body.supplierName, body.mapping);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.productsService.search(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: any,
  ) {
    return this.productsService.update(id, updateProductDto, req.user?.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.STORE_MANAGER, Role.PHARMACIST)
  toggleStatus(@Param('id') id: string) {
    return this.productsService.toggleStatus(id);
  }
}
