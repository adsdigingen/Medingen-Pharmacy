import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrugScheduleRegisterRepository } from './repository/drug-schedule-register.repository';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class DrugScheduleRegisterService {
  constructor(
    private readonly repo: DrugScheduleRegisterRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // Drug register creation is now handled inside BillingService.$transaction
  // (step 9 of executeCheckout) to guarantee atomicity. No event listener needed.


  async findAll(query: {
    search?: string;
    scheduleType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    pharmacist?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 15);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.scheduleType && query.scheduleType !== 'All') {
      where.scheduleType = query.scheduleType;
    }

    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query.pharmacist) {
      where.verifiedBy = query.pharmacist;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // Adjust end date to capture the full day (up to 23:59:59.999)
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Search query matches product name, invoice billNumber, patient, doctor, prescription
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { bill: { billNumber: { contains: s, mode: 'insensitive' } } },
        { patientName: { contains: s, mode: 'insensitive' } },
        { doctorName: { contains: s, mode: 'insensitive' } },
        { prescriptionNumber: { contains: s, mode: 'insensitive' } },
        { batchNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: true,
          product: true,
        },
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
    const entry = await this.repo.findUnique({
      where: { id },
      include: {
        bill: {
          include: {
            customer: true,
          },
        },
        product: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Drug register log with ID "${id}" not found.`);
    }

    return entry;
  }

  async verify(id: string, dto: VerifyRegisterDto, username: string) {
    const entry: any = await this.findOne(id);

    await this.prisma.drugScheduleRegister.updateMany({
      where: { invoiceId: entry.invoiceId },
      data: {
        patientName: dto.patientName ?? entry.patientName,
        doctorName: dto.doctorName ?? entry.doctorName,
        prescriptionNumber: dto.prescriptionNumber ?? entry.prescriptionNumber,
        verifiedBy: username,
        verifiedAt: new Date(),
        status: 'VERIFIED',
      },
    });

    const updated: any = await this.findOne(id);

    await this.auditLogs.log(
      null,
      username,
      'DRUG_SCHEDULE',
      'VERIFY',
      'LOCAL_DESKTOP',
      `Verified statutory sale entries for Invoice #${updated.bill.billNumber}`,
    );

    return updated;
  }

  async saveSignature(id: string, dto: SaveSignatureDto, username: string) {
    const entry = await this.findOne(id);

    await this.prisma.drugScheduleRegister.updateMany({
      where: { invoiceId: entry.invoiceId },
      data: {
        signatureImage: dto.signatureImage || null,
        signatureType: dto.signatureType,
        verifiedBy: username,
        verifiedAt: entry.verifiedAt || new Date(),
        status: 'VERIFIED',
      },
    });

    const updated: any = await this.findOne(id);

    await this.auditLogs.log(
      null,
      username,
      'DRUG_SCHEDULE',
      'SIGNATURE_ADD',
      'LOCAL_DESKTOP',
      `Saved digital signature for Invoice #${updated.bill.billNumber}`,
    );

    return updated;
  }

  async printRegister(ids: string[], username: string) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No register entries specified for printing.');
    }

    const printedRecords = [];
    for (const id of ids) {
      const entry = await this.repo.update({
        where: { id },
        data: {
          status: 'PRINTED',
          printedAt: new Date(),
        },
      });
      printedRecords.push(entry);
    }

    await this.auditLogs.log(
      null,
      username,
      'DRUG_SCHEDULE',
      'PRINT',
      'LOCAL_DESKTOP',
      `Printed official statutory drug register. Total records: ${ids.length}`,
    );

    return {
      success: true,
      printedCount: ids.length,
    };
  }

  async generatePrintHtml(query: {
    search?: string;
    scheduleType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    pharmacist?: string;
    username: string;
    storeName?: string;
  }) {
    const settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });
    const storeName = 'MEDINGEN PHARMACY';
    let address = settings?.address || 'No. 12, GST Road, Guindy, Chennai 600032';
    if (address.includes('(Drug Lic:')) {
      address = address.split('(Drug Lic:')[0].trim();
    }
    if (address.endsWith(',') || address.endsWith(';')) {
      address = address.slice(0, -1).trim();
    }
    const gstin = settings?.gstin || '33AAAAA1111A1Z1';

    // Retrieve ALL records matching criteria (without limit pagination)
    const where: any = {};

    if (query.scheduleType && query.scheduleType !== 'All') {
      where.scheduleType = query.scheduleType;
    }

    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query.pharmacist) {
      where.verifiedBy = query.pharmacist;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { bill: { billNumber: { contains: s, mode: 'insensitive' } } },
        { patientName: { contains: s, mode: 'insensitive' } },
        { doctorName: { contains: s, mode: 'insensitive' } },
        { prescriptionNumber: { contains: s, mode: 'insensitive' } },
        { batchNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const items: any[] = await this.repo.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        bill: true,
        product: true,
      },
    });

    const dateRangeStr =
      query.startDate || query.endDate
        ? `${query.startDate || 'Beginning'} to ${query.endDate || 'Today'}`
        : 'All Records';

    // Fetch expiry dates for all items in a single bulk lookup
    const productIds = Array.from(new Set(items.map(it => it.productId)));
    const batchNumbers = Array.from(new Set(items.map(it => it.batchNumber)));
    const dbBatches = await this.prisma.batch.findMany({
      where: {
        productId: { in: productIds },
        batchNumber: { in: batchNumbers }
      },
      select: {
        productId: true,
        batchNumber: true,
        expiryDate: true
      }
    });

    const expiryLookup: Record<string, string> = {};
    for (const b of dbBatches) {
      const key = `${b.productId}_${b.batchNumber}`;
      const expDate = new Date(b.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' });
      expiryLookup[key] = expDate;
    }

    // Group items by bill/invoice number for print rendering
    const groupedMap: Record<string, any> = {};
    for (const item of items) {
      const billNo = item.bill.billNumber;
      if (!groupedMap[billNo]) {
        groupedMap[billNo] = {
          ...item,
          medicines: [item],
        };
      } else {
        groupedMap[billNo].medicines.push(item);
      }
    }
    const groupedList = Object.values(groupedMap);

    const tableRowsHtml = groupedList
      .map((item) => {
        const dateStr = new Date(item.createdAt).toLocaleDateString('en-GB');
        const sigHtml = item.signatureImage
          ? `<img src="${item.signatureImage}" style="height: 25px; max-width: 100px; object-fit: contain;" />`
          : '';
        
        // Build rows of medicines within this invoice box row
        const medicineDetailsHtml = item.medicines.map((m: any, idx: number) => {
          const borderStyle = idx > 0 ? 'border-top: 1px dashed #eee; margin-top: 4px; padding-top: 4px;' : '';
          return `<div style="${borderStyle}"><strong>${m.product.name}</strong><br/><small style="color:#555;">Generic: ${m.product.genericName || 'N/A'}</small></div>`;
        }).join('');

        const scheduleHtml = Array.from(new Set(item.medicines.map((m: any) => m.scheduleType.replace('Schedule ', '')))).join(', ');

        const batchHtml = item.medicines.map((m: any, idx: number) => {
          const borderStyle = idx > 0 ? 'border-top: 1px dashed #eee; margin-top: 4px; padding-top: 4px;' : '';
          const lookupKey = `${m.productId}_${m.batchNumber}`;
          const expStr = expiryLookup[lookupKey] ? `Exp: ${expiryLookup[lookupKey]}` : 'Exp: N/A';
          return `
            <div style="${borderStyle}">
              <strong>${m.batchNumber}</strong>
              <div style="font-size: 8px; color: #666; margin-top: 1px;">${expStr}</div>
            </div>
          `;
        }).join('');

        const quantityHtml = item.medicines.map((m: any, idx: number) => {
          const borderStyle = idx > 0 ? 'border-top: 1px dashed #eee; margin-top: 4px; padding-top: 4px;' : '';
          return `<div style="${borderStyle}">${m.quantity}</div>`;
        }).join('');
        
        return `
        <tr>
          <td>${item.bill.billNumber}</td>
          <td>${dateStr}</td>
          <td>${medicineDetailsHtml}</td>
          <td style="text-align: center;">${scheduleHtml}</td>
          <td>${batchHtml}</td>
          <td style="text-align: center; font-weight: bold;">${quantityHtml}</td>
          <td>${item.patientName || 'Walk-In Patient'}</td>
          <td>${item.doctorName || '-'}</td>
          <td style="text-align: center; vertical-align: middle;">${sigHtml}</td>
        </tr>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Drug Schedule Register Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #111;
            margin: 20px;
            line-height: 1.3;
          }
          .header-container {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .pharmacy-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 5px 0;
            text-align: center;
          }
          .report-title {
            font-size: 12px;
            font-weight: bold;
            margin: 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .metadata-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 9px;
            color: #333;
          }
          table.register-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          table.register-table th {
            border-bottom: 1px dashed #000;
            padding: 6px 4px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            text-align: left;
          }
          table.register-table td {
            border-bottom: 1px dashed #eee;
            padding: 6px 4px;
            font-size: 9px;
            vertical-align: top;
          }
          .footer-container {
            border-top: 1px dashed #000;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #444;
          }
          @media print {
            body {
              margin: 10px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; padding: 10px; background-color: #f0f4f8; border: 1px solid #d0d8e0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #1e3a5f;">Print Preview Console</span>
          <button onclick="window.print();" style="padding: 6px 14px; background-color: #0d9488; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Send to Printer / Save PDF</button>
        </div>

        <div class="header-container">
          <h1 class="pharmacy-title">${storeName}</h1>
          <div style="text-align: center; font-size: 10px; color: #333; margin-bottom: 5px; line-height: 1.4;">
            ${address} <br/>
            <strong>GSTIN:</strong> ${gstin}
          </div>
          <h2 class="report-title" style="margin-top: 10px;">STATUTORY DRUG LOG REGISTER (SCHEDULE H / H1 / X / NDPS)</h2>
          <div class="metadata-grid" style="border-top: 1px dashed #ccc; padding-top: 5px; margin-top: 8px;">
            <div><strong>Drug Schedule:</strong> ${query.scheduleType || 'All regulated'}</div>
            <div><strong>Date Range:</strong> ${dateRangeStr}</div>
            <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
            <div><strong>Generated By:</strong> ${query.username}</div>
          </div>
        </div>

        <table class="register-table">
          <thead>
            <tr>
              <th style="width: 80px;">Invoice</th>
              <th style="width: 60px;">Date</th>
              <th>Medicine Description</th>
              <th style="width: 50px; text-align: center;">Schedule</th>
              <th style="width: 70px;">Batch</th>
              <th style="width: 30px; text-align: center;">Qty</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th style="width: 100px; text-align: center;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="9" style="text-align:center; padding: 20px; color:#555;">No records match the filter criteria.</td></tr>'}
          </tbody>
        </table>

        <div class="footer-container">
          <div>TOTAL RECORD COUNT: <strong>${groupedList.length}</strong></div>
          <div>PRINTED BY: ${query.username}</div>
          <div>GENERATED TIME: ${new Date().toLocaleTimeString()}</div>
          <div>MEDINGEN statutory compliance ledger - Confidential</div>
        </div>
      </body>
      </html>
    `;
  }
}
