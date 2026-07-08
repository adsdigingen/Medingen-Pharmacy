import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
      gstPercentage: createProductDto.gstPercentage ?? 0.0,
      purchasePrice: createProductDto.purchasePrice ?? 0.0,
      sellingPrice: createProductDto.sellingPrice ?? 0.0,
      mrp: createProductDto.mrp ?? 0.0,
      minStockLevel: createProductDto.minStockLevel ?? 0,
      rackLocation: createProductDto.rackLocation,
      description: createProductDto.description,
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
      gstPercentage: dto.gstPercentage ?? 0.0,
      purchasePrice: dto.purchasePrice ?? 0.0,
      sellingPrice: dto.sellingPrice ?? 0.0,
      mrp: dto.mrp ?? 0.0,
      minStockLevel: dto.minStockLevel ?? 0,
      rackLocation: dto.rackLocation,
      description: dto.description,
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

  async update(id: string, updateProductDto: UpdateProductDto) {
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
      purchasePrice: updateProductDto.purchasePrice !== undefined ? updateProductDto.purchasePrice : product.purchasePrice,
      sellingPrice: updateProductDto.sellingPrice !== undefined ? updateProductDto.sellingPrice : product.sellingPrice,
      mrp: updateProductDto.mrp !== undefined ? updateProductDto.mrp : product.mrp,
      minStockLevel: updateProductDto.minStockLevel !== undefined ? updateProductDto.minStockLevel : product.minStockLevel,
      rackLocation: updateProductDto.rackLocation !== undefined ? updateProductDto.rackLocation : product.rackLocation,
      description: updateProductDto.description !== undefined ? updateProductDto.description : product.description,
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
            sellingPrice: row['Selling Price'] !== undefined ? sellingPrice : existingProduct.sellingPrice,
            mrp: row['MRP'] !== undefined ? mrp : existingProduct.mrp,
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
            sellingPrice,
            mrp,
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
      'Minimum Stock': p.minStockLevel,
      'Rack Location': p.rackLocation || '',
      'Description': p.description || '',
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
        'Selling Price': 28.20,
        'MRP': 30.00,
        'Minimum Stock': 100,
        'Rack Location': 'A-04',
        'Description': 'For fever and mild to moderate pain relief',
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

            const gstPercentage = row.gstPercentage !== undefined ? parseFloat(row.gstPercentage) || 0 : 0;
            const purchasePrice = row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) || 0 : 0;
            const sellingPrice = row.sellingPrice !== undefined ? parseFloat(row.sellingPrice) || 0 : 0;
            const mrp = row.mrp !== undefined ? parseFloat(row.mrp) || 0 : 0;
            const minStockLevel = row.minStockLevel !== undefined ? parseInt(row.minStockLevel) || 0 : 0;
            const status = row.status !== undefined ? (String(row.status).toLowerCase() === 'active' || row.status === true) : true;

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
                    gstPercentage: gstPercentage !== undefined ? gstPercentage : existingProduct.gstPercentage,
                    purchasePrice: purchasePrice !== undefined ? purchasePrice : existingProduct.purchasePrice,
                    sellingPrice: sellingPrice !== undefined ? sellingPrice : existingProduct.sellingPrice,
                    mrp: mrp !== undefined ? mrp : existingProduct.mrp,
                    minStockLevel: minStockLevel !== undefined ? minStockLevel : existingProduct.minStockLevel,
                    rackLocation: rackLocation || existingProduct.rackLocation,
                    description: description || existingProduct.description,
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
                if ((existingProduct.minStockLevel === null || existingProduct.minStockLevel === 0) && minStockLevel) {
                  updateData.minStockLevel = minStockLevel;
                }
                if (!existingProduct.rackLocation && rackLocation) updateData.rackLocation = rackLocation;
                if (!existingProduct.description && description) updateData.description = description;

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
                    minStockLevel,
                    rackLocation,
                    description,
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
                  minStockLevel,
                  rackLocation,
                  description,
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

            const gstPercentage = row.gstPercentage !== undefined ? parseFloat(row.gstPercentage) || 0 : 0;
            const purchasePrice = row.purchasePrice !== undefined ? parseFloat(row.purchasePrice) || 0 : 0;
            const sellingPrice = row.sellingPrice !== undefined ? parseFloat(row.sellingPrice) || 0 : 0;
            const mrp = row.mrp !== undefined ? parseFloat(row.mrp) || 0 : 0;
            const minStockLevel = row.minStockLevel !== undefined ? parseInt(row.minStockLevel) || 0 : 0;
            const status = row.status !== undefined ? (String(row.status).toLowerCase() === 'active' || row.status === true) : true;

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
                    gstPercentage: gstPercentage !== undefined ? gstPercentage : existingProduct.gstPercentage,
                    purchasePrice: purchasePrice !== undefined ? purchasePrice : existingProduct.purchasePrice,
                    sellingPrice: sellingPrice !== undefined ? sellingPrice : existingProduct.sellingPrice,
                    mrp: mrp !== undefined ? mrp : existingProduct.mrp,
                    minStockLevel: minStockLevel !== undefined ? minStockLevel : existingProduct.minStockLevel,
                    rackLocation: rackLocation || existingProduct.rackLocation,
                    description: description || existingProduct.description,
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
                if ((existingProduct.minStockLevel === null || existingProduct.minStockLevel === 0) && minStockLevel) {
                  updateData.minStockLevel = minStockLevel;
                }
                if (!existingProduct.rackLocation && rackLocation) updateData.rackLocation = rackLocation;
                if (!existingProduct.description && description) updateData.description = description;

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
                    minStockLevel,
                    rackLocation,
                    description,
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
                  minStockLevel,
                  rackLocation,
                  description,
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

