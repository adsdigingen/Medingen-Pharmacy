import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SyncStatus } from '@medingen/db';
import * as xlsx from 'xlsx';
import { ProductRepository } from './repository/product.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductCreatedEvent, ProductUpdatedEvent } from './events/product.events';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProductRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getPricingDefaults() {
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      });
      if (!settings) {
        return {
          defaultOfflineMarkup: 50.0,
          defaultOnlineMarkup: 85.0,
          defaultGst: 12.0,
          defaultRetailDiscount: 0.0,
        };
      }
      return settings;
    } catch (e) {
      console.warn('[ProductsService] Failed to fetch system settings from database, returning static defaults:', e.message);
      return {
        defaultOfflineMarkup: 50.0,
        defaultOnlineMarkup: 85.0,
        defaultGst: 12.0,
        defaultRetailDiscount: 0.0,
      };
    }
  }

  private calculateProductPrices(
    purchasePrice: number,
    mrp: number,
    offlineMarkup: number,
    onlineMarkup: number,
    offlineAutoCalculate: boolean,
    onlineAutoCalculate: boolean,
    roundOff: boolean,
    inputOfflinePrice: number,
    inputOnlinePrice: number,
  ) {
    let offlinePrice = inputOfflinePrice;
    let onlinePrice = inputOnlinePrice;

    if (offlineAutoCalculate) {
      const calcPrice = purchasePrice * (1 + offlineMarkup / 100);
      offlinePrice = roundOff ? Math.round(calcPrice) : parseFloat(calcPrice.toFixed(2));
    }

    if (onlineAutoCalculate) {
      const calcPrice = purchasePrice * (1 + onlineMarkup / 100);
      onlinePrice = roundOff ? Math.round(calcPrice) : parseFloat(calcPrice.toFixed(2));
    }

    let calculatedOfflineMarkup = offlineMarkup;
    let calculatedOnlineMarkup = onlineMarkup;

    if (!offlineAutoCalculate && purchasePrice > 0) {
      calculatedOfflineMarkup = parseFloat((((offlinePrice - purchasePrice) / purchasePrice) * 100).toFixed(2));
    }
    if (!onlineAutoCalculate && purchasePrice > 0) {
      calculatedOnlineMarkup = parseFloat((((onlinePrice - purchasePrice) / purchasePrice) * 100).toFixed(2));
    }

    if (purchasePrice > 0) {
      if (offlinePrice < purchasePrice) {
        throw new BadRequestException('Offline Selling Price cannot be lower than Purchase Price.');
      }
      if (onlinePrice < purchasePrice) {
        throw new BadRequestException('Online Selling Price cannot be lower than Purchase Price.');
      }
    }
    if (mrp > 0) {
      if (offlinePrice > mrp) {
        throw new BadRequestException('Offline Selling Price exceeds MRP.');
      }
      if (onlinePrice > mrp) {
        throw new BadRequestException('Online Selling Price exceeds MRP.');
      }
    }

    return {
      offlineSellingPrice: offlinePrice,
      onlineSellingPrice: onlinePrice,
      offlineMarkup: calculatedOfflineMarkup,
      onlineMarkup: calculatedOnlineMarkup,
    };
  }

  async create(createProductDto: CreateProductDto) {
    const name = createProductDto.name.trim();

    // Check unique constraints: barcode
    if (createProductDto.barcode) {
      const existingBarcode = await this.repo.findFirst({
        where: { barcode: createProductDto.barcode },
      });
      if (existingBarcode) {
        if (existingBarcode.deletedAt) {
          // Restore and update the soft-deleted product
          return this.restoreProduct(existingBarcode.id, createProductDto);
        }
        throw new ConflictException(`Product with barcode "${createProductDto.barcode}" already exists.`);
      }
    }

    // Check unique constraints: SKU
    if (createProductDto.sku) {
      const existingSku = await this.repo.findFirst({
        where: { sku: createProductDto.sku },
      });
      if (existingSku) {
        if (existingSku.deletedAt) {
          // Restore and update
          return this.restoreProduct(existingSku.id, createProductDto);
        }
        throw new ConflictException(`Product with SKU "${createProductDto.sku}" already exists.`);
      }
    }

    const defaults = await this.getPricingDefaults();
    
    const purchasePrice = createProductDto.purchasePrice ?? 0.0;
    const mrp = createProductDto.mrp ?? 0.0;
    const gstPercentage = createProductDto.gstPercentage ?? defaults.defaultGst;
    
    const offlineMarkup = createProductDto.offlineMarkup ?? defaults.defaultOfflineMarkup;
    const onlineMarkup = createProductDto.onlineMarkup ?? defaults.defaultOnlineMarkup;
    
    const offlineAutoCalculate = createProductDto.offlineAutoCalculate ?? true;
    const onlineAutoCalculate = createProductDto.onlineAutoCalculate ?? true;
    const roundOff = createProductDto.roundOff ?? true;
    
    const inputOfflinePrice = createProductDto.offlineSellingPrice ?? 0.0;
    const inputOnlinePrice = createProductDto.onlineSellingPrice ?? 0.0;

    const calculated = this.calculateProductPrices(
      purchasePrice,
      mrp,
      offlineMarkup,
      onlineMarkup,
      offlineAutoCalculate,
      onlineAutoCalculate,
      roundOff,
      inputOfflinePrice,
      inputOnlinePrice,
    );

    const result = await this.repo.create({
      name,
      genericName: createProductDto.genericName,
      brandName: createProductDto.brandName,
      barcode: createProductDto.barcode || null,
      sku: createProductDto.sku || null,
      categoryId: createProductDto.categoryId || null,
      manufacturerId: createProductDto.manufacturerId || null,
      supplierId: createProductDto.supplierId || null,
      hsnCode: createProductDto.hsnCode,
      gstPercentage,
      purchasePrice,
      sellingPrice: calculated.offlineSellingPrice,
      mrp,
      offlineMarkup: calculated.offlineMarkup,
      offlineSellingPrice: calculated.offlineSellingPrice,
      offlineAutoCalculate,
      onlineMarkup: calculated.onlineMarkup,
      onlineSellingPrice: calculated.onlineSellingPrice,
      onlineAutoCalculate,
      wholesalePrice: createProductDto.wholesalePrice ?? 0.0,
      hospitalPrice: createProductDto.hospitalPrice ?? 0.0,
      memberPrice: createProductDto.memberPrice ?? 0.0,
      specialOfferPrice: createProductDto.specialOfferPrice ?? 0.0,
      retailDiscount: createProductDto.retailDiscount ?? defaults.defaultRetailDiscount,
      roundOff,
      minStockLevel: createProductDto.minStockLevel ?? 0,
      rackLocation: createProductDto.rackLocation,
      description: createProductDto.description,
      drugSchedule: createProductDto.drugSchedule || null,
      medicineClassification: createProductDto.medicineClassification || null,
      prescriptionRequired: createProductDto.prescriptionRequired ?? false,
      coldChainRequired: createProductDto.coldChainRequired ?? false,
      controlledDrug: createProductDto.controlledDrug ?? false,
      highValueMedicine: createProductDto.highValueMedicine ?? false,
      storageCondition: createProductDto.storageCondition || null,
      status: createProductDto.status ?? true,
      syncStatus: SyncStatus.PENDING,
    });

    if (result) {
      this.eventEmitter.emit(
        'product.created',
        new ProductCreatedEvent(result.id, result.name, result.sku, result.barcode),
      );
    }

    return result;
  }

  private async restoreProduct(id: string, dto: CreateProductDto) {
    const defaults = await this.getPricingDefaults();
    
    const purchasePrice = dto.purchasePrice ?? 0.0;
    const mrp = dto.mrp ?? 0.0;
    const gstPercentage = dto.gstPercentage ?? defaults.defaultGst;
    
    const offlineMarkup = dto.offlineMarkup ?? defaults.defaultOfflineMarkup;
    const onlineMarkup = dto.onlineMarkup ?? defaults.defaultOnlineMarkup;
    
    const offlineAutoCalculate = dto.offlineAutoCalculate ?? true;
    const onlineAutoCalculate = dto.onlineAutoCalculate ?? true;
    const roundOff = dto.roundOff ?? true;
    
    const inputOfflinePrice = dto.offlineSellingPrice ?? 0.0;
    const inputOnlinePrice = dto.onlineSellingPrice ?? 0.0;

    const calculated = this.calculateProductPrices(
      purchasePrice,
      mrp,
      offlineMarkup,
      onlineMarkup,
      offlineAutoCalculate,
      onlineAutoCalculate,
      roundOff,
      inputOfflinePrice,
      inputOnlinePrice,
    );

    return this.repo.update(id, {
      deletedAt: null,
      name: dto.name,
      genericName: dto.genericName,
      brandName: dto.brandName,
      barcode: dto.barcode || null,
      sku: dto.sku || null,
      categoryId: dto.categoryId || null,
      manufacturerId: dto.manufacturerId || null,
      supplierId: dto.supplierId || null,
      hsnCode: dto.hsnCode,
      gstPercentage,
      purchasePrice,
      sellingPrice: calculated.offlineSellingPrice,
      mrp,
      offlineMarkup: calculated.offlineMarkup,
      offlineSellingPrice: calculated.offlineSellingPrice,
      offlineAutoCalculate,
      onlineMarkup: calculated.onlineMarkup,
      onlineSellingPrice: calculated.onlineSellingPrice,
      onlineAutoCalculate,
      wholesalePrice: dto.wholesalePrice ?? 0.0,
      hospitalPrice: dto.hospitalPrice ?? 0.0,
      memberPrice: dto.memberPrice ?? 0.0,
      specialOfferPrice: dto.specialOfferPrice ?? 0.0,
      retailDiscount: dto.retailDiscount ?? defaults.defaultRetailDiscount,
      roundOff,
      minStockLevel: dto.minStockLevel ?? 0,
      rackLocation: dto.rackLocation,
      description: dto.description,
      drugSchedule: dto.drugSchedule || null,
      medicineClassification: dto.medicineClassification || null,
      prescriptionRequired: dto.prescriptionRequired ?? false,
      coldChainRequired: dto.coldChainRequired ?? false,
      controlledDrug: dto.controlledDrug ?? false,
      highValueMedicine: dto.highValueMedicine ?? false,
      storageCondition: dto.storageCondition || null,
      status: dto.status ?? true,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async findAll(query: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    supplierId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    drugSchedule?: string;
    medicineClassification?: string;
    prescriptionRequired?: string;
    controlledDrug?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { name: { contains: searchTrim, mode: 'insensitive' } },
        { genericName: { contains: searchTrim, mode: 'insensitive' } },
        { brandName: { contains: searchTrim, mode: 'insensitive' } },
        { barcode: { contains: searchTrim, mode: 'insensitive' } },
        { sku: { contains: searchTrim, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.manufacturerId) {
      where.manufacturerId = query.manufacturerId;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.status !== undefined && query.status !== '') {
      where.status = query.status === 'true' || query.status === 'active';
    }

    if (query.drugSchedule) {
      where.drugSchedule = query.drugSchedule;
    }
    if (query.medicineClassification) {
      where.medicineClassification = query.medicineClassification;
    }
    if (query.prescriptionRequired !== undefined && query.prescriptionRequired !== '') {
      where.prescriptionRequired = query.prescriptionRequired === 'true';
    }
    if (query.controlledDrug !== undefined && query.controlledDrug !== '') {
      where.controlledDrug = query.controlledDrug === 'true';
    }

    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'asc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.repo.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.repo.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, userRole?: string) {
    const product = await this.findOne(id);

    // Validate unique barcode
    if (updateProductDto.barcode && updateProductDto.barcode !== product.barcode) {
      const existingBarcode = await this.repo.findFirst({
        where: { barcode: updateProductDto.barcode, id: { not: id } },
      });
      if (existingBarcode) {
        throw new ConflictException(`Product with barcode "${updateProductDto.barcode}" already exists.`);
      }
    }

    // Validate unique SKU
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.repo.findFirst({
        where: { sku: updateProductDto.sku, id: { not: id } },
      });
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${updateProductDto.sku}" already exists.`);
      }
    }

    // Pharmacist Role Constraint
    if (userRole === 'PHARMACIST') {
      const forbiddenFields = [
        'purchasePrice',
        'mrp',
        'gstPercentage',
        'offlineMarkup',
        'onlineMarkup',
        'offlineAutoCalculate',
        'onlineAutoCalculate',
        'roundOff',
      ];
      const dto = updateProductDto as any;
      const prod = product as any;
      for (const field of forbiddenFields) {
        if (dto[field] !== undefined && dto[field] !== prod[field]) {
          throw new ForbiddenException(`Pharmacists are not authorized to modify the pricing field: ${field}`);
        }
      }
    }

    const purchasePrice = updateProductDto.purchasePrice !== undefined ? updateProductDto.purchasePrice : product.purchasePrice;
    const mrp = updateProductDto.mrp !== undefined ? updateProductDto.mrp : product.mrp;
    
    const offlineMarkup = updateProductDto.offlineMarkup !== undefined ? updateProductDto.offlineMarkup : product.offlineMarkup;
    const onlineMarkup = updateProductDto.onlineMarkup !== undefined ? updateProductDto.onlineMarkup : product.onlineMarkup;
    
    const offlineAutoCalculate = updateProductDto.offlineAutoCalculate !== undefined ? updateProductDto.offlineAutoCalculate : product.offlineAutoCalculate;
    const onlineAutoCalculate = updateProductDto.onlineAutoCalculate !== undefined ? updateProductDto.onlineAutoCalculate : product.onlineAutoCalculate;
    const roundOff = updateProductDto.roundOff !== undefined ? updateProductDto.roundOff : product.roundOff;
    
    const inputOfflinePrice = updateProductDto.offlineSellingPrice !== undefined ? updateProductDto.offlineSellingPrice : product.offlineSellingPrice;
    const inputOnlinePrice = updateProductDto.onlineSellingPrice !== undefined ? updateProductDto.onlineSellingPrice : product.onlineSellingPrice;

    const calculated = this.calculateProductPrices(
      purchasePrice,
      mrp,
      offlineMarkup,
      onlineMarkup,
      offlineAutoCalculate,
      onlineAutoCalculate,
      roundOff,
      inputOfflinePrice,
      inputOnlinePrice,
    );

    const result = await this.repo.update(id, {
      name: updateProductDto.name !== undefined ? updateProductDto.name.trim() : product.name,
      genericName: updateProductDto.genericName !== undefined ? updateProductDto.genericName : product.genericName,
      brandName: updateProductDto.brandName !== undefined ? updateProductDto.brandName : product.brandName,
      barcode: updateProductDto.barcode !== undefined ? (updateProductDto.barcode || null) : product.barcode,
      sku: updateProductDto.sku !== undefined ? (updateProductDto.sku || null) : product.sku,
      categoryId: updateProductDto.categoryId !== undefined ? (updateProductDto.categoryId || null) : product.categoryId,
      manufacturerId: updateProductDto.manufacturerId !== undefined ? (updateProductDto.manufacturerId || null) : product.manufacturerId,
      supplierId: updateProductDto.supplierId !== undefined ? (updateProductDto.supplierId || null) : product.supplierId,
      hsnCode: updateProductDto.hsnCode !== undefined ? updateProductDto.hsnCode : product.hsnCode,
      gstPercentage: updateProductDto.gstPercentage !== undefined ? updateProductDto.gstPercentage : product.gstPercentage,
      purchasePrice,
      sellingPrice: calculated.offlineSellingPrice,
      mrp,
      offlineMarkup: calculated.offlineMarkup,
      offlineSellingPrice: calculated.offlineSellingPrice,
      offlineAutoCalculate,
      onlineMarkup: calculated.onlineMarkup,
      onlineSellingPrice: calculated.onlineSellingPrice,
      onlineAutoCalculate,
      wholesalePrice: updateProductDto.wholesalePrice !== undefined ? updateProductDto.wholesalePrice : product.wholesalePrice,
      hospitalPrice: updateProductDto.hospitalPrice !== undefined ? updateProductDto.hospitalPrice : product.hospitalPrice,
      memberPrice: updateProductDto.memberPrice !== undefined ? updateProductDto.memberPrice : product.memberPrice,
      specialOfferPrice: updateProductDto.specialOfferPrice !== undefined ? updateProductDto.specialOfferPrice : product.specialOfferPrice,
      retailDiscount: updateProductDto.retailDiscount !== undefined ? updateProductDto.retailDiscount : product.retailDiscount,
      roundOff,
      minStockLevel: updateProductDto.minStockLevel !== undefined ? updateProductDto.minStockLevel : product.minStockLevel,
      rackLocation: updateProductDto.rackLocation !== undefined ? updateProductDto.rackLocation : product.rackLocation,
      description: updateProductDto.description !== undefined ? updateProductDto.description : product.description,
      drugSchedule: updateProductDto.drugSchedule !== undefined ? updateProductDto.drugSchedule : product.drugSchedule,
      medicineClassification: updateProductDto.medicineClassification !== undefined ? updateProductDto.medicineClassification : product.medicineClassification,
      prescriptionRequired: updateProductDto.prescriptionRequired !== undefined ? updateProductDto.prescriptionRequired : product.prescriptionRequired,
      coldChainRequired: updateProductDto.coldChainRequired !== undefined ? updateProductDto.coldChainRequired : product.coldChainRequired,
      controlledDrug: updateProductDto.controlledDrug !== undefined ? updateProductDto.controlledDrug : product.controlledDrug,
      highValueMedicine: updateProductDto.highValueMedicine !== undefined ? updateProductDto.highValueMedicine : product.highValueMedicine,
      storageCondition: updateProductDto.storageCondition !== undefined ? updateProductDto.storageCondition : product.storageCondition,
      status: updateProductDto.status !== undefined ? updateProductDto.status : product.status,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });

    if (result) {
      this.eventEmitter.emit(
        'product.updated',
        new ProductUpdatedEvent(result.id, result.name, result.sku, result.barcode),
      );
    }

    return result;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.repo.update(id, {
      deletedAt: new Date(),
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async toggleStatus(id: string) {
    const product = await this.findOne(id);

    return this.repo.update(id, {
      status: !product.status,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date(),
    });
  }

  async importProducts(fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any>(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Helper functions to cache relation resolutions
    const categoryCache = new Map<string, string>();
    const manufacturerCache = new Map<string, string>();
    const supplierCache = new Map<string, string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // Rows are 1-indexed, and header is row 1
      const rowErrors: string[] = [];

      // Validations
      if (!row['Medicine Name'] || String(row['Medicine Name']).trim() === '') {
        rowErrors.push('Medicine Name is required.');
      }

      const purchasePrice = parseFloat(row['Purchase Price']) || 0;
      if (purchasePrice < 0) {
        rowErrors.push('Purchase Price cannot be negative.');
      }

      const sellingPrice = parseFloat(row['Selling Price']) || 0;
      if (sellingPrice < 0) {
        rowErrors.push('Selling Price cannot be negative.');
      }

      const mrp = parseFloat(row['MRP']) || 0;
      if (mrp < 0) {
        rowErrors.push('MRP cannot be negative.');
      }

      const gstPercentage = parseFloat(row['GST Percentage']) || 0;
      if (gstPercentage < 0 || gstPercentage > 100) {
        rowErrors.push('GST Percentage must be between 0 and 100.');
      }

      const minStockLevel = parseInt(row['Minimum Stock']) || 0;
      if (minStockLevel < 0) {
        rowErrors.push('Minimum Stock cannot be negative.');
      }

      if (rowErrors.length > 0) {
        errorCount++;
        errors.push({ row: rowNumber, medicineName: row['Medicine Name'] || 'Unknown', errors: rowErrors });
        continue;
      }

      try {
        // Resolve Category
        let categoryId: string | null = null;
        const categoryName = String(row['Category'] || '').trim();
        if (categoryName) {
          const cachedId = categoryCache.get(categoryName.toLowerCase());
          if (cachedId) {
            categoryId = cachedId;
          } else {
            let category = await this.prisma.category.findFirst({
              where: { name: { equals: categoryName, mode: 'insensitive' } },
            });
            if (!category) {
              category = await this.prisma.category.create({
                data: { name: categoryName, status: true, syncStatus: SyncStatus.PENDING },
              });
            }
            categoryId = category.id;
            categoryCache.set(categoryName.toLowerCase(), category.id);
          }
        }

        // Resolve Manufacturer
        let manufacturerId: string | null = null;
        const manufacturerName = String(row['Manufacturer'] || '').trim();
        if (manufacturerName) {
          const cachedId = manufacturerCache.get(manufacturerName.toLowerCase());
          if (cachedId) {
            manufacturerId = cachedId;
          } else {
            let manufacturer = await this.prisma.manufacturer.findFirst({
              where: { name: { equals: manufacturerName, mode: 'insensitive' } },
            });
            if (!manufacturer) {
              manufacturer = await this.prisma.manufacturer.create({
                data: { name: manufacturerName, status: true, syncStatus: SyncStatus.PENDING },
              });
            }
            manufacturerId = manufacturer.id;
            manufacturerCache.set(manufacturerName.toLowerCase(), manufacturer.id);
          }
        }

        // Resolve Supplier
        let supplierId: string | null = null;
        const supplierName = String(row['Supplier'] || '').trim();
        if (supplierName) {
          const cachedId = supplierCache.get(supplierName.toLowerCase());
          if (cachedId) {
            supplierId = cachedId;
          } else {
            let supplier = await this.prisma.supplier.findFirst({
              where: { name: { equals: supplierName, mode: 'insensitive' } },
            });
            if (!supplier) {
              supplier = await this.prisma.supplier.create({
                data: { name: supplierName, status: true, syncStatus: SyncStatus.PENDING },
              });
            }
            supplierId = supplier.id;
            supplierCache.set(supplierName.toLowerCase(), supplier.id);
          }
        }

        // Duplicate Detection (match by Barcode, SKU, or Name + Brand)
        const barcode = row['Barcode'] ? String(row['Barcode']).trim() : null;
        const sku = row['SKU'] ? String(row['SKU']).trim() : null;
        const name = String(row['Medicine Name']).trim();
        const brandName = row['Brand Name'] ? String(row['Brand Name']).trim() : null;

        let existingProduct: any = null;

        if (barcode) {
          existingProduct = await this.repo.findFirst({ where: { barcode } });
        }
        if (!existingProduct && sku) {
          existingProduct = await this.repo.findFirst({ where: { sku } });
        }
        if (!existingProduct) {
          existingProduct = await this.repo.findFirst({
            where: {
              name: { equals: name, mode: 'insensitive' },
              brandName: brandName ? { equals: brandName, mode: 'insensitive' } : null,
              deletedAt: null,
            },
          });
        }

        const defaults = await this.getPricingDefaults();
        
        const offlineMarkup = row['Offline Markup'] !== undefined ? parseFloat(row['Offline Markup']) : defaults.defaultOfflineMarkup;
        const onlineMarkup = row['Online Markup'] !== undefined ? parseFloat(row['Online Markup']) : defaults.defaultOnlineMarkup;
        
        const roundOff = row['Round Off'] !== undefined ? (String(row['Round Off']).toLowerCase() === 'yes' || String(row['Round Off']).toLowerCase() === 'true') : true;
        
        const inputOfflinePrice = row['Offline Selling Price'] !== undefined ? parseFloat(row['Offline Selling Price']) : (row['Selling Price'] !== undefined ? parseFloat(row['Selling Price']) : 0.0);
        const inputOnlinePrice = row['Online Selling Price'] !== undefined ? parseFloat(row['Online Selling Price']) : 0.0;
        
        const offlineAutoCalculate = row['Offline Selling Price'] === undefined;
        const onlineAutoCalculate = row['Online Selling Price'] === undefined;
        
        const calculated = this.calculateProductPrices(
          purchasePrice,
          mrp,
          offlineMarkup,
          onlineMarkup,
          offlineAutoCalculate,
          onlineAutoCalculate,
          roundOff,
          inputOfflinePrice,
          inputOnlinePrice,
        );
        
        const wholesalePrice = row['Wholesale Price'] !== undefined ? parseFloat(row['Wholesale Price']) : 0.0;
        const hospitalPrice = row['Hospital Price'] !== undefined ? parseFloat(row['Hospital Price']) : 0.0;
        const memberPrice = row['Member Price'] !== undefined ? parseFloat(row['Member Price']) : 0.0;
        const specialOfferPrice = row['Special Offer Price'] !== undefined ? parseFloat(row['Special Offer Price']) : 0.0;
        const retailDiscount = row['Retail Discount'] !== undefined ? parseFloat(row['Retail Discount']) : defaults.defaultRetailDiscount;

        if (existingProduct) {
          // Update Existing Product
          await this.repo.update(existingProduct.id, {
            deletedAt: null, // restore if soft deleted
            name,
            genericName: row['Generic Name'] ? String(row['Generic Name']).trim() : existingProduct.genericName,
            brandName: brandName || existingProduct.brandName,
            barcode: barcode || existingProduct.barcode,
            sku: sku || existingProduct.sku,
            categoryId: categoryId || existingProduct.categoryId,
            manufacturerId: manufacturerId || existingProduct.manufacturerId,
            supplierId: supplierId || existingProduct.supplierId,
            hsnCode: row['HSN Code'] ? String(row['HSN Code']).trim() : existingProduct.hsnCode,
            gstPercentage: row['GST Percentage'] !== undefined ? gstPercentage : existingProduct.gstPercentage,
            purchasePrice: row['Purchase Price'] !== undefined ? purchasePrice : existingProduct.purchasePrice,
            sellingPrice: calculated.offlineSellingPrice,
            mrp: row['MRP'] !== undefined ? mrp : existingProduct.mrp,
            offlineMarkup: calculated.offlineMarkup,
            offlineSellingPrice: calculated.offlineSellingPrice,
            offlineAutoCalculate,
            onlineMarkup: calculated.onlineMarkup,
            onlineSellingPrice: calculated.onlineSellingPrice,
            onlineAutoCalculate,
            wholesalePrice: row['Wholesale Price'] !== undefined ? wholesalePrice : existingProduct.wholesalePrice,
            hospitalPrice: row['Hospital Price'] !== undefined ? hospitalPrice : existingProduct.hospitalPrice,
            memberPrice: row['Member Price'] !== undefined ? memberPrice : existingProduct.memberPrice,
            specialOfferPrice: row['Special Offer Price'] !== undefined ? specialOfferPrice : existingProduct.specialOfferPrice,
            retailDiscount: row['Retail Discount'] !== undefined ? retailDiscount : existingProduct.retailDiscount,
            roundOff,
            minStockLevel: row['Minimum Stock'] !== undefined ? minStockLevel : existingProduct.minStockLevel,
            rackLocation: row['Rack Location'] ? String(row['Rack Location']).trim() : existingProduct.rackLocation,
            description: row['Description'] ? String(row['Description']).trim() : existingProduct.description,
            status: row['Status'] !== undefined ? (String(row['Status']).toLowerCase() === 'active') : existingProduct.status,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          });
        } else {
          // Insert New Product
          await this.repo.create({
            name,
            genericName: row['Generic Name'] ? String(row['Generic Name']).trim() : null,
            brandName: brandName,
            barcode,
            sku,
            categoryId,
            manufacturerId,
            supplierId,
            hsnCode: row['HSN Code'] ? String(row['HSN Code']).trim() : null,
            gstPercentage,
            purchasePrice,
            sellingPrice: calculated.offlineSellingPrice,
            mrp,
            offlineMarkup: calculated.offlineMarkup,
            offlineSellingPrice: calculated.offlineSellingPrice,
            offlineAutoCalculate,
            onlineMarkup: calculated.onlineMarkup,
            onlineSellingPrice: calculated.onlineSellingPrice,
            onlineAutoCalculate,
            wholesalePrice,
            hospitalPrice,
            memberPrice,
            specialOfferPrice,
            retailDiscount,
            roundOff,
            minStockLevel,
            rackLocation: row['Rack Location'] ? String(row['Rack Location']).trim() : null,
            description: row['Description'] ? String(row['Description']).trim() : null,
            status: row['Status'] !== undefined ? (String(row['Status']).toLowerCase() === 'active') : true,
            syncStatus: SyncStatus.PENDING,
          });
        }
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({ row: rowNumber, medicineName: row['Medicine Name'] || 'Unknown', errors: [err.message] });
      }
    }

    return {
      successCount,
      errorCount,
      errors,
    };
  }

  async exportProducts(query: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    supplierId?: string;
    status?: string;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      const searchTrim = query.search.trim();
      where.OR = [
        { name: { contains: searchTrim, mode: 'insensitive' } },
        { genericName: { contains: searchTrim, mode: 'insensitive' } },
        { brandName: { contains: searchTrim, mode: 'insensitive' } },
        { barcode: { contains: searchTrim, mode: 'insensitive' } },
        { sku: { contains: searchTrim, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.manufacturerId) where.manufacturerId = query.manufacturerId;
    if (query.supplierId) where.supplierId = query.supplierId;

    if (query.status !== undefined && query.status !== '') {
      where.status = query.status === 'true' || query.status === 'active';
    }

    const products = await this.repo.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const exportRows = products.map((p) => ({
      'Medicine Name': p.name,
      'Generic Name': p.genericName || '',
      'Brand Name': p.brandName || '',
      'Barcode': p.barcode || '',
      'SKU': p.sku || '',
      'Category': p.category?.name || '',
      'Manufacturer': p.manufacturer?.name || '',
      'Supplier': p.supplier?.name || '',
      'HSN Code': p.hsnCode || '',
      'GST Percentage': p.gstPercentage,
      'Purchase Price': p.purchasePrice,
      'Selling Price': p.sellingPrice,
      'MRP': p.mrp,
      'Offline Markup': p.offlineMarkup,
      'Offline Selling Price': p.offlineSellingPrice,
      'Online Markup': p.onlineMarkup,
      'Online Selling Price': p.onlineSellingPrice,
      'Wholesale Price': p.wholesalePrice,
      'Hospital Price': p.hospitalPrice,
      'Member Price': p.memberPrice,
      'Special Offer Price': p.specialOfferPrice,
      'Retail Discount': p.retailDiscount,
      'Round Off': p.roundOff ? 'Yes' : 'No',
      'Minimum Stock': p.minStockLevel,
      'Rack Location': p.rackLocation || '',
      'Description': p.description || '',
      'Drug Schedule': p.drugSchedule || 'OTC',
      'Prescription': p.prescriptionRequired ? 'Yes' : 'No',
      'Storage': p.storageCondition || 'Room Temperature',
      'Classification': p.medicineClassification || 'Other',
      'Controlled Drug': p.controlledDrug ? 'Yes' : 'No',
      'Cold Chain': p.coldChainRequired ? 'Yes' : 'No',
      'High Value': p.highValueMedicine ? 'Yes' : 'No',
      'Status': p.status ? 'Active' : 'Inactive',
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  getImportTemplate() {
    const templateRows = [
      {
        'Medicine Name': 'Paracetamol 650mg',
        'Generic Name': 'Paracetamol',
        'Brand Name': 'Dolo 650',
        'Barcode': '8901234567890',
        'SKU': 'PARA650-DOLO',
        'Category': 'Tablet',
        'Manufacturer': 'Micro Labs Ltd',
        'Supplier': 'Chennai Pharma Distributors',
        'HSN Code': '30049011',
        'GST Percentage': 12,
        'Purchase Price': 25.50,
        'Selling Price': 38.25,
        'MRP': 45.00,
        'Offline Markup': 50,
        'Offline Selling Price': 38.25,
        'Online Markup': 85,
        'Online Selling Price': 47.18,
        'Wholesale Price': 35.00,
        'Hospital Price': 34.00,
        'Member Price': 33.00,
        'Special Offer Price': 32.00,
        'Retail Discount': 5.0,
        'Round Off': 'Yes',
        'Minimum Stock': 100,
        'Rack Location': 'A-04',
        'Description': 'For fever and mild to moderate pain relief',
        'Drug Schedule': 'OTC',
        'Prescription': 'No',
        'Storage': 'Room Temperature',
        'Classification': 'Analgesic',
        'Controlled Drug': 'No',
        'Cold Chain': 'No',
        'High Value': 'No',
        'Status': 'Active',
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products Template');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  // --- UNIVERSAL ENGINE: PARSE FILE AND AUTOMATIC COLUMN DETECTION ---
  async parseImportFile(fileBuffer: Buffer) {
    console.log('[DEBUG parseImportFile] Starting parse...');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    console.log('[DEBUG parseImportFile] Workbook sheet names:', workbook.SheetNames);
    const sheetName = workbook.SheetNames[0];
    console.log('[DEBUG parseImportFile] Selected sheet name:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    
    const rows2D = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    console.log('[DEBUG parseImportFile] 2D Rows parsed from worksheet. Length:', rows2D.length);
    
    if (rows2D.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    const aliasDict = {
      name: ['product name', 'brand name', 'medicine name', 'item name', 'drug name', 'product', 'item', 'medicine', 'name', 'brand'],
      genericName: ['generic', 'generic name', 'salt name', 'salt', 'composition'],
      brandName: ['brand', 'brand name', 'brandname'],
      manufacturerName: ['manufacturer', 'mfr', 'company', 'manufacturer name', 'mfg', 'maker'],
      categoryName: ['category', 'category name', 'type', 'group'],
      purchasePrice: ['billing rate', 'billing price', 'cost price', 'cost rate', 'purchase rate', 'purchase price', 'cost', 'pur price', 'billingrate'],
      sellingPrice: ['selling price', 'selling rate', 'sales price', 'sale price', 'sell price', 'selling', 'sale rate'],
      mrp: ['mrp', 'retail price', 'maximum retail price', 'max retail price', 'm.r.p.'],
      packSize: ['packing', 'pack', 'unit', 'box size', 'pack size', 'pkg', 'packaging'],
      barcode: ['barcode', 'bar code', 'ean', 'upc', 'code128'],
      sku: ['sku', 'item code', 'product code', 'sku code', 'productcode'],
      hsnCode: ['hsn', 'hsn code', 'hsncode', 'hsn/sac'],
      gstPercentage: ['gst', 'gst percentage', 'gst %', 'gst rate', 'tax', 'tax percentage', 'tax %'],
      minStockLevel: ['minimum stock', 'min stock', 'min stock level', 'reorder level', 'qty required'],
      rackLocation: ['rack', 'rack location', 'shelf', 'location', 'rack no'],
      description: ['description', 'notes', 'remarks', 'info'],
      drugSchedule: ['drug schedule', 'schedule', 'drugschedule', 'sch'],
      prescriptionRequired: ['prescription', 'prescription required', 'rx required', 'rx', 'prescriptionrequired'],
      storageCondition: ['storage', 'storage condition', 'storage temp', 'storagecondition'],
      medicineClassification: ['classification', 'medicine classification', 'med classification', 'class', 'medicineclassification'],
      controlledDrug: ['controlled', 'controlled drug', 'controlled medication', 'controlleddrug'],
      coldChainRequired: ['cold chain', 'cold chain required', 'coldchain', 'coldchainrequired'],
      highValueMedicine: ['high value', 'high value medicine', 'highvalue', 'highvaluemedicine'],
      offlineMarkup: ['offline markup', 'offline markup %', 'offline markup percent', 'offlinemarkup'],
      offlineSellingPrice: ['offline selling price', 'offline selling rate', 'offline price', 'offlinesellingprice', 'offline rate'],
      onlineMarkup: ['online markup', 'online markup %', 'online markup percent', 'onlinemarkup'],
      onlineSellingPrice: ['online selling price', 'online selling rate', 'online price', 'onlinesellingprice', 'online rate'],
      wholesalePrice: ['wholesale price', 'wholesale price rate', 'wholesale price level', 'wholesale rate', 'wholesaleprice'],
      hospitalPrice: ['hospital price', 'hospital price rate', 'hospital rate', 'hospitalprice'],
      memberPrice: ['member price', 'member price rate', 'member rate', 'memberprice'],
      specialOfferPrice: ['special offer price', 'special offer rate', 'special price', 'specialofferprice'],
      retailDiscount: ['retail discount', 'retail discount %', 'retail discount percent', 'retaildiscount'],
      roundOff: ['round off', 'round off option', 'roundoff', 'rounding'],
      status: ['status', 'active', 'state']
    };

    let headerRowIndex = 0;
    let maxMatches = 0;

    for (let r = 0; r < Math.min(rows2D.length, 20); r++) {
      const row = rows2D[r];
      if (!row || !Array.isArray(row)) continue;

      let matches = 0;
      for (const val of row) {
        if (val === null || val === undefined || String(val).trim() === '') continue;
        const cleanVal = String(val).toLowerCase().trim().replace(/[\s\-_]/g, '');
        
        for (const aliases of Object.values(aliasDict)) {
          if (aliases.some(alias => {
            const cleanAlias = alias.toLowerCase().trim().replace(/[\s\-_]/g, '');
            return cleanVal === cleanAlias || cleanVal.includes(cleanAlias) || cleanAlias.includes(cleanVal);
          })) {
            matches++;
            break;
          }
        }
      }

      if (matches > maxMatches && matches >= 2) {
        maxMatches = matches;
        headerRowIndex = r;
      }
    }

    const headers = (rows2D[headerRowIndex] || []).map(h => String(h || '').trim()).filter(Boolean);
    if (headers.length === 0) {
      throw new BadRequestException('Could not detect any headers in the uploaded file.');
    }

    const rawRows: any[] = [];
    for (let r = headerRowIndex + 1; r < rows2D.length; r++) {
      const row = rows2D[r];
      if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        const header = headers[c];
        rowObj[header] = row[c] !== undefined ? row[c] : null;
      }
      rawRows.push(rowObj);
    }

    const suggestedMapping: Record<string, string> = {};
    const mappedDbFields = new Set<string>();

    for (const header of headers) {
      const cleanHeader = header.toLowerCase().trim().replace(/[\s\-_]/g, '');
      let matchedField: string | null = null;

      for (const [dbField, aliases] of Object.entries(aliasDict)) {
        if (mappedDbFields.has(dbField)) continue;
        
        const isMatch = aliases.some(alias => {
          const cleanAlias = alias.toLowerCase().trim().replace(/[\s\-_]/g, '');
          return cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader);
        });

        if (isMatch) {
          matchedField = dbField;
          break;
        }
      }

      if (matchedField) {
        suggestedMapping[header] = matchedField;
        mappedDbFields.add(matchedField);
      }
    }

    const previewRows = rawRows.slice(0, 50);
    console.log('[DEBUG parseImportFile] Mapped rows count:', rawRows.length);

    return {
      headers,
      suggestedMapping,
      previewRows,
      totalRows: rawRows.length
    };
  }

  // --- UNIVERSAL ENGINE: DETAILED RECORD VALIDATION ---
  async validateImportRows(rows: any[], mapping: Record<string, string>, duplicateMode: string) {
    const resultRows: any[] = [];
    const errorsList: any[] = [];

    // Extract values to fetch existing DB matches
    const rawNameKey = Object.keys(mapping).find(key => mapping[key] === 'name');
    const rawBarcodeKey = Object.keys(mapping).find(key => mapping[key] === 'barcode');
    const rawSkuKey = Object.keys(mapping).find(key => mapping[key] === 'sku');

    const barcodes = rows.map(r => rawBarcodeKey ? String(r[rawBarcodeKey] || '').trim() : '').filter(Boolean);
    const skus = rows.map(r => rawSkuKey ? String(r[rawSkuKey] || '').trim() : '').filter(Boolean);
    const names = rows.map(r => rawNameKey ? String(r[rawNameKey] || '').trim() : '').filter(Boolean);

    const dbProducts = await this.prisma.product.findMany({
      where: {
        OR: [
          { barcode: { in: barcodes } },
          { sku: { in: skus } },
          { name: { in: names, mode: 'insensitive' } }
        ],
        deletedAt: null
      }
    });

    const seenBarcodes = new Set<string>();
    const seenSkus = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const rowErrors: string[] = [];

      const mapped: any = {};
      for (const [rawCol, dbField] of Object.entries(mapping)) {
        mapped[dbField] = row[rawCol] !== undefined ? row[rawCol] : null;
      }

      const name = String(mapped.name || '').trim();
      if (!name) {
        rowErrors.push('Product Name is required.');
      }

      const mrp = parseFloat(mapped.mrp);
      const cost = parseFloat(mapped.purchasePrice);
      
      if (mapped.mrp !== null && mapped.mrp !== undefined && mapped.mrp !== '') {
        if (isNaN(mrp)) rowErrors.push('MRP must be numeric.');
        else if (mrp < 0) rowErrors.push('MRP cannot be negative.');
      } else {
        rowErrors.push('MRP is required.');
      }

      if (mapped.purchasePrice !== null && mapped.purchasePrice !== undefined && mapped.purchasePrice !== '') {
        if (isNaN(cost)) rowErrors.push('Purchase Price must be numeric.');
        else if (cost < 0) rowErrors.push('Purchase Price cannot be negative.');
      } else {
        rowErrors.push('Purchase Price is required.');
      }

      if (!isNaN(mrp) && !isNaN(cost) && mrp >= 0 && cost >= 0) {
        if (mrp < cost) {
          rowErrors.push('MRP must be greater than or equal to Purchase Price.');
        }
      }

      const defaults = await this.getPricingDefaults();
      const offlineMarkup = mapped.offlineMarkup !== null && mapped.offlineMarkup !== undefined && mapped.offlineMarkup !== '' ? parseFloat(mapped.offlineMarkup) : defaults.defaultOfflineMarkup;
      const onlineMarkup = mapped.onlineMarkup !== null && mapped.onlineMarkup !== undefined && mapped.onlineMarkup !== '' ? parseFloat(mapped.onlineMarkup) : defaults.defaultOnlineMarkup;
      const roundOff = mapped.roundOff !== null && mapped.roundOff !== undefined && mapped.roundOff !== '' ? (String(mapped.roundOff).toLowerCase() === 'yes' || String(mapped.roundOff).toLowerCase() === 'true' || mapped.roundOff === true) : true;
      const offlineAutoCalculate = mapped.offlineSellingPrice === null || mapped.offlineSellingPrice === undefined || mapped.offlineSellingPrice === '';
      const onlineAutoCalculate = mapped.onlineSellingPrice === null || mapped.onlineSellingPrice === undefined || mapped.onlineSellingPrice === '';

      let calculatedOfflinePrice = 0.0;
      let calculatedOnlinePrice = 0.0;

      if (!isNaN(cost) && cost >= 0) {
        if (offlineAutoCalculate) {
          const calc = cost * (1 + offlineMarkup / 100);
          calculatedOfflinePrice = roundOff ? Math.round(calc) : parseFloat(calc.toFixed(2));
        } else {
          calculatedOfflinePrice = parseFloat(mapped.offlineSellingPrice);
        }

        if (onlineAutoCalculate) {
          const calc = cost * (1 + onlineMarkup / 100);
          calculatedOnlinePrice = roundOff ? Math.round(calc) : parseFloat(calc.toFixed(2));
        } else {
          calculatedOnlinePrice = parseFloat(mapped.onlineSellingPrice);
        }

        if (!isNaN(calculatedOfflinePrice)) {
          if (calculatedOfflinePrice < cost) {
            rowErrors.push('Offline Selling Price cannot be lower than Purchase Price.');
          }
          if (!isNaN(mrp) && mrp > 0 && calculatedOfflinePrice > mrp) {
            rowErrors.push('Offline Selling Price exceeds MRP.');
          }
        }

        if (!isNaN(calculatedOnlinePrice)) {
          if (calculatedOnlinePrice < cost) {
            rowErrors.push('Online Selling Price cannot be lower than Purchase Price.');
          }
          if (!isNaN(mrp) && mrp > 0 && calculatedOnlinePrice > mrp) {
            rowErrors.push('Online Selling Price exceeds MRP.');
          }
        }
      }

      if (mapped.wholesalePrice !== null && mapped.wholesalePrice !== undefined && mapped.wholesalePrice !== '') {
        if (isNaN(parseFloat(mapped.wholesalePrice)) || parseFloat(mapped.wholesalePrice) < 0) {
          rowErrors.push('Wholesale Price must be a non-negative number.');
        }
      }
      if (mapped.hospitalPrice !== null && mapped.hospitalPrice !== undefined && mapped.hospitalPrice !== '') {
        if (isNaN(parseFloat(mapped.hospitalPrice)) || parseFloat(mapped.hospitalPrice) < 0) {
          rowErrors.push('Hospital Price must be a non-negative number.');
        }
      }
      if (mapped.memberPrice !== null && mapped.memberPrice !== undefined && mapped.memberPrice !== '') {
        if (isNaN(parseFloat(mapped.memberPrice)) || parseFloat(mapped.memberPrice) < 0) {
          rowErrors.push('Member Price must be a non-negative number.');
        }
      }
      if (mapped.specialOfferPrice !== null && mapped.specialOfferPrice !== undefined && mapped.specialOfferPrice !== '') {
        if (isNaN(parseFloat(mapped.specialOfferPrice)) || parseFloat(mapped.specialOfferPrice) < 0) {
          rowErrors.push('Special Offer Price must be a non-negative number.');
        }
      }
      if (mapped.retailDiscount !== null && mapped.retailDiscount !== undefined && mapped.retailDiscount !== '') {
        const disc = parseFloat(mapped.retailDiscount);
        if (isNaN(disc) || disc < 0 || disc > 100) {
          rowErrors.push('Retail Discount % must be between 0 and 100.');
        }
      }

      if (mapped.gstPercentage !== null && mapped.gstPercentage !== undefined && mapped.gstPercentage !== '') {
        const gst = parseFloat(mapped.gstPercentage);
        if (isNaN(gst)) rowErrors.push('GST Percentage must be numeric.');
        else if (gst < 0 || gst > 100) rowErrors.push('GST Percentage must be between 0 and 100.');
      }

      if (mapped.minStockLevel !== null && mapped.minStockLevel !== undefined && mapped.minStockLevel !== '') {
        const minStock = parseInt(mapped.minStockLevel);
        if (isNaN(minStock)) rowErrors.push('Minimum Stock must be numeric.');
        else if (minStock < 0) rowErrors.push('Minimum Stock cannot be negative.');
      }

      const barcode = String(mapped.barcode || '').trim();
      const sku = String(mapped.sku || '').trim();

      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          rowErrors.push(`Duplicate Barcode in upload file: "${barcode}".`);
        }
        seenBarcodes.add(barcode);
      }
      if (sku) {
        if (seenSkus.has(sku)) {
          rowErrors.push(`Duplicate SKU in upload file: "${sku}".`);
        }
        seenSkus.add(sku);
      }

      let status = 'New Product';
      let existing = null;

      if (barcode) {
        existing = dbProducts.find(p => p.barcode === barcode);
      }
      if (!existing && sku) {
        existing = dbProducts.find(p => p.sku === sku);
      }
      if (!existing && name) {
        existing = dbProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
      }

      if (existing) {
        status = 'Duplicate';
        if (duplicateMode === 'CREATE_NEW') {
          if (barcode && existing.barcode === barcode) {
            rowErrors.push(`Barcode unique constraint violated: "${barcode}" matches ${existing.name} in DB.`);
          }
          if (sku && existing.sku === sku) {
            rowErrors.push(`SKU unique constraint violated: "${sku}" matches ${existing.name} in DB.`);
          }
        }
      }

      if (rowErrors.length > 0) {
        status = 'Invalid';
        errorsList.push({
          row: rowNum,
          name: name || 'Unknown Medicine',
          details: rowErrors
        });
      }

      resultRows.push({
        rowNum,
        name,
        genericName: String(mapped.genericName || '').trim(),
        brandName: String(mapped.brandName || '').trim(),
        manufacturerName: String(mapped.manufacturerName || '').trim(),
        categoryName: String(mapped.categoryName || '').trim(),
        barcode,
        sku,
        cost: isNaN(cost) ? 0 : cost,
        mrp: isNaN(mrp) ? 0 : mrp,
        offlineMarkup: isNaN(offlineMarkup) ? defaults.defaultOfflineMarkup : offlineMarkup,
        offlineSellingPrice: isNaN(calculatedOfflinePrice) ? 0 : calculatedOfflinePrice,
        offlineAutoCalculate,
        onlineMarkup: isNaN(onlineMarkup) ? defaults.defaultOnlineMarkup : onlineMarkup,
        onlineSellingPrice: isNaN(calculatedOnlinePrice) ? 0 : calculatedOnlinePrice,
        onlineAutoCalculate,
        wholesalePrice: isNaN(parseFloat(mapped.wholesalePrice)) ? 0 : parseFloat(mapped.wholesalePrice),
        hospitalPrice: isNaN(parseFloat(mapped.hospitalPrice)) ? 0 : parseFloat(mapped.hospitalPrice),
        memberPrice: isNaN(parseFloat(mapped.memberPrice)) ? 0 : parseFloat(mapped.memberPrice),
        specialOfferPrice: isNaN(parseFloat(mapped.specialOfferPrice)) ? 0 : parseFloat(mapped.specialOfferPrice),
        retailDiscount: isNaN(parseFloat(mapped.retailDiscount)) ? defaults.defaultRetailDiscount : parseFloat(mapped.retailDiscount),
        roundOff,
        drugSchedule: String(mapped.drugSchedule || '').trim() || 'OTC',
        medicineClassification: String(mapped.medicineClassification || '').trim() || 'Other',
        prescriptionRequired: String(mapped.prescriptionRequired || '').toLowerCase().trim() === 'yes' || String(mapped.prescriptionRequired || '').toLowerCase().trim() === 'true' || mapped.prescriptionRequired === true,
        storageCondition: String(mapped.storageCondition || '').trim() || 'Room Temperature',
        controlledDrug: String(mapped.controlledDrug || '').toLowerCase().trim() === 'yes' || String(mapped.controlledDrug || '').toLowerCase().trim() === 'true' || mapped.controlledDrug === true,
        coldChainRequired: String(mapped.coldChainRequired || '').toLowerCase().trim() === 'yes' || String(mapped.coldChainRequired || '').toLowerCase().trim() === 'true' || mapped.coldChainRequired === true,
        highValueMedicine: String(mapped.highValueMedicine || '').toLowerCase().trim() === 'yes' || String(mapped.highValueMedicine || '').toLowerCase().trim() === 'true' || mapped.highValueMedicine === true,
        valid: rowErrors.length === 0,
        errors: rowErrors,
        status
      });
    }

    return {
      previewRows: resultRows,
      validationErrors: errorsList
    };
  }

  // --- UNIVERSAL ENGINE: TRANSACTION CHUNK INSERT/UPDATE ---
  async importChunk(rows: any[], mapping: Record<string, string>, duplicateMode: string) {
    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errorsList: any[] = [];

    const categoryCache = new Map<string, string>();
    const manufacturerCache = new Map<string, string>();
    const supplierCache = new Map<string, string>();

    const resolveCategory = async (name: string, tx: any) => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      const key = cleanName.toLowerCase();
      if (categoryCache.has(key)) return categoryCache.get(key);

      let category = await tx.category.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } }
      });
      if (!category) {
        category = await tx.category.create({
          data: { name: cleanName, status: true, syncStatus: 'PENDING' }
        });
      }
      categoryCache.set(key, category.id);
      return category.id;
    };

    const resolveManufacturer = async (name: string, tx: any) => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      const key = cleanName.toLowerCase();
      if (manufacturerCache.has(key)) return manufacturerCache.get(key);

      let manufacturer = await tx.manufacturer.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } }
      });
      if (!manufacturer) {
        manufacturer = await tx.manufacturer.create({
          data: { name: cleanName, status: true, syncStatus: 'PENDING' }
        });
      }
      manufacturerCache.set(key, manufacturer.id);
      return manufacturer.id;
    };

    const resolveSupplier = async (name: string, tx: any) => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      const key = cleanName.toLowerCase();
      if (supplierCache.has(key)) return supplierCache.get(key);

      let supplier = await tx.supplier.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } }
      });
      if (!supplier) {
        supplier = await tx.supplier.create({
          data: { name: cleanName, status: true, syncStatus: 'PENDING' }
        });
      }
      supplierCache.set(key, supplier.id);
      return supplier.id;
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = row.rowNum || (i + 2);

          if (row.valid === false) {
            errorCount++;
            errorsList.push({
              row: rowNum,
              name: row.name || 'Unknown',
              errors: row.errors || ['Invalid row data.']
            });
            continue;
          }

          try {
            const name = String(row.name).trim();
            const genericName = row.genericName ? String(row.genericName).trim() : null;
            const brandName = row.brandName ? String(row.brandName).trim() : null;
            const barcode = row.barcode ? String(row.barcode).trim() : null;
            const sku = row.sku ? String(row.sku).trim() : null;
            const hsnCode = row.hsnCode ? String(row.hsnCode).trim() : null;
            const rackLocation = row.rackLocation ? String(row.rackLocation).trim() : null;
            const description = row.description ? String(row.description).trim() : null;

            const costVal = row.cost !== undefined ? parseFloat(row.cost) || 0 : (row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) || 0 : 0);
            const gstPercentage = row.gstPercentage !== undefined ? parseFloat(row.gstPercentage) || 0 : 0;
            const purchasePrice = costVal;
            const mrp = row.mrp !== undefined ? parseFloat(row.mrp) || 0 : 0;
            const minStockLevel = row.minStockLevel !== undefined ? parseInt(row.minStockLevel) || 0 : 0;
            const status = row.status !== undefined ? (String(row.status).toLowerCase() === 'active' || row.status === true) : true;

            const drugSchedule = row.drugSchedule !== undefined ? String(row.drugSchedule).trim() || null : null;
            const medicineClassification = row.medicineClassification !== undefined ? String(row.medicineClassification).trim() || null : null;
            const prescriptionRequired = row.prescriptionRequired === true || String(row.prescriptionRequired).toLowerCase() === 'true';
            const coldChainRequired = row.coldChainRequired === true || String(row.coldChainRequired).toLowerCase() === 'true';
            const controlledDrug = row.controlledDrug === true || String(row.controlledDrug).toLowerCase() === 'true';
            const highValueMedicine = row.highValueMedicine === true || String(row.highValueMedicine).toLowerCase() === 'true';
            const storageCondition = row.storageCondition !== undefined ? String(row.storageCondition).trim() || null : null;

            const offlineMarkup = row.offlineMarkup !== undefined ? parseFloat(row.offlineMarkup) : 50.0;
            const offlineSellingPrice = row.offlineSellingPrice !== undefined ? parseFloat(row.offlineSellingPrice) : 0.0;
            const offlineAutoCalculate = row.offlineAutoCalculate !== undefined ? !!row.offlineAutoCalculate : true;
            
            const onlineMarkup = row.onlineMarkup !== undefined ? parseFloat(row.onlineMarkup) : 85.0;
            const onlineSellingPrice = row.onlineSellingPrice !== undefined ? parseFloat(row.onlineSellingPrice) : 0.0;
            const onlineAutoCalculate = row.onlineAutoCalculate !== undefined ? !!row.onlineAutoCalculate : true;
            
            const wholesalePrice = row.wholesalePrice !== undefined ? parseFloat(row.wholesalePrice) : 0.0;
            const hospitalPrice = row.hospitalPrice !== undefined ? parseFloat(row.hospitalPrice) : 0.0;
            const memberPrice = row.memberPrice !== undefined ? parseFloat(row.memberPrice) : 0.0;
            const specialOfferPrice = row.specialOfferPrice !== undefined ? parseFloat(row.specialOfferPrice) : 0.0;
            const retailDiscount = row.retailDiscount !== undefined ? parseFloat(row.retailDiscount) : 0.0;
            const roundOff = row.roundOff !== undefined ? !!row.roundOff : true;
            
            const sellingPrice = offlineSellingPrice; // Base sellingPrice is synced to offlineStorePrice

            const categoryId = row.categoryName ? await resolveCategory(row.categoryName, tx) : null;
            const manufacturerId = row.manufacturerName ? await resolveManufacturer(row.manufacturerName, tx) : null;
            const supplierId = row.supplierName ? await resolveSupplier(row.supplierName, tx) : null;

            let existingProduct = null;
            if (barcode) {
              existingProduct = await tx.product.findFirst({ where: { barcode, deletedAt: null } });
            }
            if (!existingProduct && sku) {
              existingProduct = await tx.product.findFirst({ where: { sku, deletedAt: null } });
            }
            if (!existingProduct) {
              existingProduct = await tx.product.findFirst({
                where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null }
              });
            }

            if (existingProduct) {
              if (duplicateMode === 'SKIP_DUPLICATES') {
                skippedCount++;
                continue;
              }

              if (duplicateMode === 'UPDATE_EXISTING') {
                await tx.product.update({
                  where: { id: existingProduct.id },
                  data: {
                    name,
                    genericName: genericName || existingProduct.genericName,
                    brandName: brandName || existingProduct.brandName,
                    barcode: barcode || existingProduct.barcode,
                    sku: sku || existingProduct.sku,
                    categoryId: categoryId || existingProduct.categoryId,
                    manufacturerId: manufacturerId || existingProduct.manufacturerId,
                    supplierId: supplierId || existingProduct.supplierId,
                    hsnCode: hsnCode || existingProduct.hsnCode,
                    gstPercentage,
                    purchasePrice,
                    sellingPrice,
                    mrp,
                    offlineMarkup,
                    offlineSellingPrice,
                    offlineAutoCalculate,
                    onlineMarkup,
                    onlineSellingPrice,
                    onlineAutoCalculate,
                    wholesalePrice,
                    hospitalPrice,
                    memberPrice,
                    specialOfferPrice,
                    retailDiscount,
                    roundOff,
                    minStockLevel: minStockLevel !== undefined ? minStockLevel : existingProduct.minStockLevel,
                    rackLocation: rackLocation || existingProduct.rackLocation,
                    description: description || existingProduct.description,
                    drugSchedule: drugSchedule !== undefined ? drugSchedule : existingProduct.drugSchedule,
                    medicineClassification: medicineClassification !== undefined ? medicineClassification : existingProduct.medicineClassification,
                    prescriptionRequired: prescriptionRequired !== undefined ? prescriptionRequired : existingProduct.prescriptionRequired,
                    coldChainRequired: coldChainRequired !== undefined ? coldChainRequired : existingProduct.coldChainRequired,
                    controlledDrug: controlledDrug !== undefined ? controlledDrug : existingProduct.controlledDrug,
                    highValueMedicine: highValueMedicine !== undefined ? highValueMedicine : existingProduct.highValueMedicine,
                    storageCondition: storageCondition !== undefined ? storageCondition : existingProduct.storageCondition,
                    status,
                    syncStatus: 'PENDING',
                    updatedAt: new Date(),
                  }
                });
                updatedCount++;
              } else if (duplicateMode === 'MERGE_MISSING') {
                const updateData: any = {
                  updatedAt: new Date(),
                  syncStatus: 'PENDING',
                };

                if (!existingProduct.genericName && genericName) updateData.genericName = genericName;
                if (!existingProduct.brandName && brandName) updateData.brandName = brandName;
                if (!existingProduct.barcode && barcode) updateData.barcode = barcode;
                if (!existingProduct.sku && sku) updateData.sku = sku;
                if (!existingProduct.categoryId && categoryId) updateData.categoryId = categoryId;
                if (!existingProduct.manufacturerId && manufacturerId) updateData.manufacturerId = manufacturerId;
                if (!existingProduct.supplierId && supplierId) updateData.supplierId = supplierId;
                if (!existingProduct.hsnCode && hsnCode) updateData.hsnCode = hsnCode;
                if ((existingProduct.gstPercentage === null || existingProduct.gstPercentage === 0) && gstPercentage) {
                  updateData.gstPercentage = gstPercentage;
                }
                if ((existingProduct.purchasePrice === null || existingProduct.purchasePrice === 0) && purchasePrice) {
                  updateData.purchasePrice = purchasePrice;
                }
                if ((existingProduct.sellingPrice === null || existingProduct.sellingPrice === 0) && sellingPrice) {
                  updateData.sellingPrice = sellingPrice;
                }
                if ((existingProduct.mrp === null || existingProduct.mrp === 0) && mrp) {
                  updateData.mrp = mrp;
                }
                if ((existingProduct.offlineSellingPrice === null || existingProduct.offlineSellingPrice === 0) && offlineSellingPrice) {
                  updateData.offlineSellingPrice = offlineSellingPrice;
                  updateData.offlineMarkup = offlineMarkup;
                  updateData.offlineAutoCalculate = offlineAutoCalculate;
                }
                if ((existingProduct.onlineSellingPrice === null || existingProduct.onlineSellingPrice === 0) && onlineSellingPrice) {
                  updateData.onlineSellingPrice = onlineSellingPrice;
                  updateData.onlineMarkup = onlineMarkup;
                  updateData.onlineAutoCalculate = onlineAutoCalculate;
                }
                if ((existingProduct.wholesalePrice === null || existingProduct.wholesalePrice === 0) && wholesalePrice) {
                  updateData.wholesalePrice = wholesalePrice;
                }
                if ((existingProduct.hospitalPrice === null || existingProduct.hospitalPrice === 0) && hospitalPrice) {
                  updateData.hospitalPrice = hospitalPrice;
                }
                if ((existingProduct.memberPrice === null || existingProduct.memberPrice === 0) && memberPrice) {
                  updateData.memberPrice = memberPrice;
                }
                if ((existingProduct.specialOfferPrice === null || existingProduct.specialOfferPrice === 0) && specialOfferPrice) {
                  updateData.specialOfferPrice = specialOfferPrice;
                }
                if ((existingProduct.retailDiscount === null || existingProduct.retailDiscount === 0) && retailDiscount) {
                  updateData.retailDiscount = retailDiscount;
                }
                updateData.roundOff = roundOff;
                if ((existingProduct.minStockLevel === null || existingProduct.minStockLevel === 0) && minStockLevel) {
                  updateData.minStockLevel = minStockLevel;
                }
                if (!existingProduct.rackLocation && rackLocation) updateData.rackLocation = rackLocation;
                if (!existingProduct.description && description) updateData.description = description;

                if (!existingProduct.drugSchedule && drugSchedule) updateData.drugSchedule = drugSchedule;
                if (!existingProduct.medicineClassification && medicineClassification) updateData.medicineClassification = medicineClassification;
                if (!existingProduct.prescriptionRequired && prescriptionRequired) updateData.prescriptionRequired = prescriptionRequired;
                if (!existingProduct.coldChainRequired && coldChainRequired) updateData.coldChainRequired = coldChainRequired;
                if (!existingProduct.controlledDrug && controlledDrug) updateData.controlledDrug = controlledDrug;
                if (!existingProduct.highValueMedicine && highValueMedicine) updateData.highValueMedicine = highValueMedicine;
                if (!existingProduct.storageCondition && storageCondition) updateData.storageCondition = storageCondition;

                await tx.product.update({
                  where: { id: existingProduct.id },
                  data: updateData
                });
                updatedCount++;
              } else {
                const uniqueSuffix = `-dup-${Date.now().toString().slice(-4)}`;
                await tx.product.create({
                  data: {
                    name: `${name} (Dup)`,
                    genericName,
                    brandName,
                    barcode: barcode ? `${barcode}${uniqueSuffix}` : null,
                    sku: sku ? `${sku}${uniqueSuffix}` : null,
                    categoryId,
                    manufacturerId,
                    supplierId,
                    hsnCode,
                    gstPercentage,
                    purchasePrice,
                    sellingPrice,
                    mrp,
                    offlineMarkup,
                    offlineSellingPrice,
                    offlineAutoCalculate,
                    onlineMarkup,
                    onlineSellingPrice,
                    onlineAutoCalculate,
                    wholesalePrice,
                    hospitalPrice,
                    memberPrice,
                    specialOfferPrice,
                    retailDiscount,
                    roundOff,
                    minStockLevel,
                    rackLocation,
                    description,
                    drugSchedule,
                    medicineClassification,
                    prescriptionRequired,
                    coldChainRequired,
                    controlledDrug,
                    highValueMedicine,
                    storageCondition,
                    status,
                    syncStatus: 'PENDING',
                  }
                });
                successCount++;
              }
            } else {
              await tx.product.create({
                data: {
                  name,
                  genericName,
                  brandName,
                  barcode,
                  sku,
                  categoryId,
                  manufacturerId,
                  supplierId,
                  hsnCode,
                  gstPercentage,
                  purchasePrice,
                  sellingPrice,
                  mrp,
                  offlineMarkup,
                  offlineSellingPrice,
                  offlineAutoCalculate,
                  onlineMarkup,
                  onlineSellingPrice,
                  onlineAutoCalculate,
                  wholesalePrice,
                  hospitalPrice,
                  memberPrice,
                  specialOfferPrice,
                  retailDiscount,
                  roundOff,
                  minStockLevel,
                  rackLocation,
                  description,
                  drugSchedule,
                  medicineClassification,
                  prescriptionRequired,
                  coldChainRequired,
                  controlledDrug,
                  highValueMedicine,
                  storageCondition,
                  status,
                  syncStatus: 'PENDING',
                }
              });
              successCount++;
            }
          } catch (rowErr: any) {
            errorCount++;
            errorsList.push({
              row: rowNum,
              name: row.name || 'Unknown',
              errors: [rowErr.message]
            });
          }
        }
      });
    } catch (txErr: any) {
      console.warn('Prisma transaction failed, falling back to sequential imports:', txErr.message);
      successCount = 0;
      errorCount = 0;
      updatedCount = 0;
      skippedCount = 0;
      errorsList.length = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = row.rowNum || (i + 2);

        if (row.valid === false) {
          errorCount++;
          errorsList.push({
            row: rowNum,
            name: row.name || 'Unknown',
            errors: row.errors || ['Invalid row data.']
          });
          continue;
        }

        try {
          await this.prisma.$transaction(async (tx) => {
            const name = String(row.name).trim();
            const genericName = row.genericName ? String(row.genericName).trim() : null;
            const brandName = row.brandName ? String(row.brandName).trim() : null;
            const barcode = row.barcode ? String(row.barcode).trim() : null;
            const sku = row.sku ? String(row.sku).trim() : null;
            const hsnCode = row.hsnCode ? String(row.hsnCode).trim() : null;
            const rackLocation = row.rackLocation ? String(row.rackLocation).trim() : null;
            const description = row.description ? String(row.description).trim() : null;

            const costVal = row.cost !== undefined ? parseFloat(row.cost) || 0 : (row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) || 0 : 0);
            const gstPercentage = row.gstPercentage !== undefined ? parseFloat(row.gstPercentage) || 0 : 0;
            const purchasePrice = costVal;
            const mrp = row.mrp !== undefined ? parseFloat(row.mrp) || 0 : 0;
            const minStockLevel = row.minStockLevel !== undefined ? parseInt(row.minStockLevel) || 0 : 0;
            const status = row.status !== undefined ? (String(row.status).toLowerCase() === 'active' || row.status === true) : true;

            const drugSchedule = row.drugSchedule !== undefined ? String(row.drugSchedule).trim() || null : null;
            const medicineClassification = row.medicineClassification !== undefined ? String(row.medicineClassification).trim() || null : null;
            const prescriptionRequired = row.prescriptionRequired === true || String(row.prescriptionRequired).toLowerCase() === 'true';
            const coldChainRequired = row.coldChainRequired === true || String(row.coldChainRequired).toLowerCase() === 'true';
            const controlledDrug = row.controlledDrug === true || String(row.controlledDrug).toLowerCase() === 'true';
            const highValueMedicine = row.highValueMedicine === true || String(row.highValueMedicine).toLowerCase() === 'true';
            const storageCondition = row.storageCondition !== undefined ? String(row.storageCondition).trim() || null : null;

            const offlineMarkup = row.offlineMarkup !== undefined ? parseFloat(row.offlineMarkup) : 50.0;
            const offlineSellingPrice = row.offlineSellingPrice !== undefined ? parseFloat(row.offlineSellingPrice) : 0.0;
            const offlineAutoCalculate = row.offlineAutoCalculate !== undefined ? !!row.offlineAutoCalculate : true;
            
            const onlineMarkup = row.onlineMarkup !== undefined ? parseFloat(row.onlineMarkup) : 85.0;
            const onlineSellingPrice = row.onlineSellingPrice !== undefined ? parseFloat(row.onlineSellingPrice) : 0.0;
            const onlineAutoCalculate = row.onlineAutoCalculate !== undefined ? !!row.onlineAutoCalculate : true;
            
            const wholesalePrice = row.wholesalePrice !== undefined ? parseFloat(row.wholesalePrice) : 0.0;
            const hospitalPrice = row.hospitalPrice !== undefined ? parseFloat(row.hospitalPrice) : 0.0;
            const memberPrice = row.memberPrice !== undefined ? parseFloat(row.memberPrice) : 0.0;
            const specialOfferPrice = row.specialOfferPrice !== undefined ? parseFloat(row.specialOfferPrice) : 0.0;
            const retailDiscount = row.retailDiscount !== undefined ? parseFloat(row.retailDiscount) : 0.0;
            const roundOff = row.roundOff !== undefined ? !!row.roundOff : true;
            
            const sellingPrice = offlineSellingPrice; // Base sellingPrice is synced to offlineStorePrice

            const categoryId = row.categoryName ? await resolveCategory(row.categoryName, tx) : null;
            const manufacturerId = row.manufacturerName ? await resolveManufacturer(row.manufacturerName, tx) : null;
            const supplierId = row.supplierName ? await resolveSupplier(row.supplierName, tx) : null;

            let existingProduct = null;
            if (barcode) {
              existingProduct = await tx.product.findFirst({ where: { barcode, deletedAt: null } });
            }
            if (!existingProduct && sku) {
              existingProduct = await tx.product.findFirst({ where: { sku, deletedAt: null } });
            }
            if (!existingProduct) {
              existingProduct = await tx.product.findFirst({
                where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null }
              });
            }

            if (existingProduct) {
              if (duplicateMode === 'SKIP_DUPLICATES') {
                skippedCount++;
              } else if (duplicateMode === 'UPDATE_EXISTING') {
                await tx.product.update({
                  where: { id: existingProduct.id },
                  data: {
                    name,
                    genericName: genericName || existingProduct.genericName,
                    brandName: brandName || existingProduct.brandName,
                    barcode: barcode || existingProduct.barcode,
                    sku: sku || existingProduct.sku,
                    categoryId: categoryId || existingProduct.categoryId,
                    manufacturerId: manufacturerId || existingProduct.manufacturerId,
                    supplierId: supplierId || existingProduct.supplierId,
                    hsnCode: hsnCode || existingProduct.hsnCode,
                    gstPercentage,
                    purchasePrice,
                    sellingPrice,
                    mrp,
                    offlineMarkup,
                    offlineSellingPrice,
                    offlineAutoCalculate,
                    onlineMarkup,
                    onlineSellingPrice,
                    onlineAutoCalculate,
                    wholesalePrice,
                    hospitalPrice,
                    memberPrice,
                    specialOfferPrice,
                    retailDiscount,
                    roundOff,
                    minStockLevel: minStockLevel !== undefined ? minStockLevel : existingProduct.minStockLevel,
                    rackLocation: rackLocation || existingProduct.rackLocation,
                    description: description || existingProduct.description,
                    drugSchedule: drugSchedule !== undefined ? drugSchedule : existingProduct.drugSchedule,
                    medicineClassification: medicineClassification !== undefined ? medicineClassification : existingProduct.medicineClassification,
                    prescriptionRequired: prescriptionRequired !== undefined ? prescriptionRequired : existingProduct.prescriptionRequired,
                    coldChainRequired: coldChainRequired !== undefined ? coldChainRequired : existingProduct.coldChainRequired,
                    controlledDrug: controlledDrug !== undefined ? controlledDrug : existingProduct.controlledDrug,
                    highValueMedicine: highValueMedicine !== undefined ? highValueMedicine : existingProduct.highValueMedicine,
                    storageCondition: storageCondition !== undefined ? storageCondition : existingProduct.storageCondition,
                    status,
                    syncStatus: 'PENDING',
                    updatedAt: new Date(),
                  }
                });
                updatedCount++;
              } else if (duplicateMode === 'MERGE_MISSING') {
                const updateData: any = {
                  updatedAt: new Date(),
                  syncStatus: 'PENDING',
                };

                if (!existingProduct.genericName && genericName) updateData.genericName = genericName;
                if (!existingProduct.brandName && brandName) updateData.brandName = brandName;
                if (!existingProduct.barcode && barcode) updateData.barcode = barcode;
                if (!existingProduct.sku && sku) updateData.sku = sku;
                if (!existingProduct.categoryId && categoryId) updateData.categoryId = categoryId;
                if (!existingProduct.manufacturerId && manufacturerId) updateData.manufacturerId = manufacturerId;
                if (!existingProduct.supplierId && supplierId) updateData.supplierId = supplierId;
                if (!existingProduct.hsnCode && hsnCode) updateData.hsnCode = hsnCode;
                if ((existingProduct.gstPercentage === null || existingProduct.gstPercentage === 0) && gstPercentage) {
                  updateData.gstPercentage = gstPercentage;
                }
                if ((existingProduct.purchasePrice === null || existingProduct.purchasePrice === 0) && purchasePrice) {
                  updateData.purchasePrice = purchasePrice;
                }
                if ((existingProduct.sellingPrice === null || existingProduct.sellingPrice === 0) && sellingPrice) {
                  updateData.sellingPrice = sellingPrice;
                }
                if ((existingProduct.mrp === null || existingProduct.mrp === 0) && mrp) {
                  updateData.mrp = mrp;
                }
                if ((existingProduct.offlineSellingPrice === null || existingProduct.offlineSellingPrice === 0) && offlineSellingPrice) {
                  updateData.offlineSellingPrice = offlineSellingPrice;
                  updateData.offlineMarkup = offlineMarkup;
                  updateData.offlineAutoCalculate = offlineAutoCalculate;
                }
                if ((existingProduct.onlineSellingPrice === null || existingProduct.onlineSellingPrice === 0) && onlineSellingPrice) {
                  updateData.onlineSellingPrice = onlineSellingPrice;
                  updateData.onlineMarkup = onlineMarkup;
                  updateData.onlineAutoCalculate = onlineAutoCalculate;
                }
                if ((existingProduct.wholesalePrice === null || existingProduct.wholesalePrice === 0) && wholesalePrice) {
                  updateData.wholesalePrice = wholesalePrice;
                }
                if ((existingProduct.hospitalPrice === null || existingProduct.hospitalPrice === 0) && hospitalPrice) {
                  updateData.hospitalPrice = hospitalPrice;
                }
                if ((existingProduct.memberPrice === null || existingProduct.memberPrice === 0) && memberPrice) {
                  updateData.memberPrice = memberPrice;
                }
                if ((existingProduct.specialOfferPrice === null || existingProduct.specialOfferPrice === 0) && specialOfferPrice) {
                  updateData.specialOfferPrice = specialOfferPrice;
                }
                if ((existingProduct.retailDiscount === null || existingProduct.retailDiscount === 0) && retailDiscount) {
                  updateData.retailDiscount = retailDiscount;
                }
                updateData.roundOff = roundOff;
                if ((existingProduct.minStockLevel === null || existingProduct.minStockLevel === 0) && minStockLevel) {
                  updateData.minStockLevel = minStockLevel;
                }
                if (!existingProduct.rackLocation && rackLocation) updateData.rackLocation = rackLocation;
                if (!existingProduct.description && description) updateData.description = description;

                if (!existingProduct.drugSchedule && drugSchedule) updateData.drugSchedule = drugSchedule;
                if (!existingProduct.medicineClassification && medicineClassification) updateData.medicineClassification = medicineClassification;
                if (!existingProduct.prescriptionRequired && prescriptionRequired) updateData.prescriptionRequired = prescriptionRequired;
                if (!existingProduct.coldChainRequired && coldChainRequired) updateData.coldChainRequired = coldChainRequired;
                if (!existingProduct.controlledDrug && controlledDrug) updateData.controlledDrug = controlledDrug;
                if (!existingProduct.highValueMedicine && highValueMedicine) updateData.highValueMedicine = highValueMedicine;
                if (!existingProduct.storageCondition && storageCondition) updateData.storageCondition = storageCondition;

                await tx.product.update({
                  where: { id: existingProduct.id },
                  data: updateData
                });
                updatedCount++;
              } else {
                const uniqueSuffix = `-dup-${Date.now().toString().slice(-4)}`;
                await tx.product.create({
                  data: {
                    name: `${name} (Dup)`,
                    genericName,
                    brandName,
                    barcode: barcode ? `${barcode}${uniqueSuffix}` : null,
                    sku: sku ? `${sku}${uniqueSuffix}` : null,
                    categoryId,
                    manufacturerId,
                    supplierId,
                    hsnCode,
                    gstPercentage,
                    purchasePrice,
                    sellingPrice,
                    mrp,
                    offlineMarkup,
                    offlineSellingPrice,
                    offlineAutoCalculate,
                    onlineMarkup,
                    onlineSellingPrice,
                    onlineAutoCalculate,
                    wholesalePrice,
                    hospitalPrice,
                    memberPrice,
                    specialOfferPrice,
                    retailDiscount,
                    roundOff,
                    minStockLevel,
                    rackLocation,
                    description,
                    drugSchedule,
                    medicineClassification,
                    prescriptionRequired,
                    coldChainRequired,
                    controlledDrug,
                    highValueMedicine,
                    storageCondition,
                    status,
                    syncStatus: 'PENDING',
                  }
                });
                successCount++;
              }
            } else {
              await tx.product.create({
                data: {
                  name,
                  genericName,
                  brandName,
                  barcode,
                  sku,
                  categoryId,
                  manufacturerId,
                  supplierId,
                  hsnCode,
                  gstPercentage,
                  purchasePrice,
                  sellingPrice,
                  mrp,
                  offlineMarkup,
                  offlineSellingPrice,
                  offlineAutoCalculate,
                  onlineMarkup,
                  onlineSellingPrice,
                  onlineAutoCalculate,
                  wholesalePrice,
                  hospitalPrice,
                  memberPrice,
                  specialOfferPrice,
                  retailDiscount,
                  roundOff,
                  minStockLevel,
                  rackLocation,
                  description,
                  drugSchedule,
                  medicineClassification,
                  prescriptionRequired,
                  coldChainRequired,
                  controlledDrug,
                  highValueMedicine,
                  storageCondition,
                  status,
                  syncStatus: 'PENDING',
                }
              });
              successCount++;
            }
          });
        } catch (rowErr: any) {
          errorCount++;
          errorsList.push({
            row: rowNum,
            name: row.name || 'Unknown',
            errors: [rowErr.message]
          });
        }
      }
    }

    return {
      successCount,
      errorCount,
      updatedCount,
      skippedCount,
      errors: errorsList
    };
  }

  // --- UNIVERSAL ENGINE: EVENT EMIT HELPER ROUTINGS ---
  async emitImportStarted(importId: string, supplierName: string, totalRows: number) {
    this.eventEmitter.emit('product.import.started', { importId, supplierName, totalRows, startedAt: new Date() });
  }

  async emitImportCompleted(importId: string, supplierName: string, successCount: number, errorCount: number) {
    this.eventEmitter.emit('product.import.completed', { importId, supplierName, successCount, errorCount, completedAt: new Date() });
  }

  async emitImportFailed(importId: string, supplierName: string, error: string) {
    this.eventEmitter.emit('product.import.failed', { importId, supplierName, error, failedAt: new Date() });
  }

  // --- UNIVERSAL ENGINE: SUPPLIER MAPPING CRUD ---
  async getSupplierMappings() {
    return this.prisma.supplierMapping.findMany({
      orderBy: { supplierName: 'asc' }
    });
  }

  async saveSupplierMapping(supplierName: string, mapping: any) {
    const existing = await this.prisma.supplierMapping.findFirst({
      where: { supplierName: { equals: supplierName, mode: 'insensitive' } }
    });

    if (existing) {
      return this.prisma.supplierMapping.update({
        where: { id: existing.id },
        data: { mapping }
      });
    } else {
      return this.prisma.supplierMapping.create({
        data: { supplierName, mapping }
      });
    }
  }
}

