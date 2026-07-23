import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrintService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReceiptText(billId: string, widthType: '58mm' | '80mm' | '150x95mm' = '80mm') {
    const [bill, settings] = await Promise.all([
      this.prisma.bill.findUnique({
        where: { id: billId },
        include: {
          customer: true,
          billItems: {
            include: {
              batch: {
                include: {
                  product: true,
                },
              },
            },
          },
          payments: true,
        },
      }),
      this.prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      }),
    ]);

    if (!bill || bill.deletedAt) {
      throw new NotFoundException(`Invoice with ID "${billId}" not found.`);
    }

    if (widthType === '150x95mm') {
      const width = 80;
      const lines: string[] = [];

      // Formatter helpers
      const center = (text: string) => {
        const pad = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(pad) + text;
      };

      const separator = () => '-'.repeat(width);

      const padLeftRight = (left: string, right: string) => {
        const spacing = width - left.length - right.length;
        if (spacing <= 0) return left.substring(0, width - right.length - 1) + ' ' + right;
        return left + ' '.repeat(spacing) + right;
      };

      // 1. Header
      lines.push(center(settings?.storeName?.toUpperCase() || "MEDINGEN PHARMACY"));
      if (settings?.address) {
        lines.push(center(settings.address));
      }
      if (settings?.phone) {
        lines.push(center(`Phone: ${settings.phone}`));
      }
      
      const timeStr = new Date(bill.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      lines.push(padLeftRight("  SALES BILL", timeStr));

      // 2. Metadata
      const patName = `Pat.Name:  ${bill.customer?.name || 'Registered Customer'}`;
      const billNo = `Bill No:   ${bill.billNumber}`;
      lines.push(padLeftRight(patName, billNo));

      const drName = `Dr.Name:   ${bill.doctorName || 'Self / Referral'}`;
      const billDate = `Bill Date: ${new Date(bill.createdAt).toLocaleDateString('en-GB')}`;
      lines.push(padLeftRight(drName, billDate));

      const cusPhone = `Cus.Phone: ${bill.customer?.mobile || '-'}`;
      lines.push(padLeftRight(cusPhone, ""));
      lines.push(separator());

      // 3. Columns header
      const col1 = "   Product Name".padEnd(25);
      const col2 = "Batch".padEnd(12) + " " + "Exp".padEnd(6);
      const col3 = "Qty".padStart(6) + " " + "Rate".padStart(8) + " " + "MRP".padStart(8) + " " + "Amount".padStart(9);
      lines.push(col1 + col2 + " " + col3);
      lines.push(separator());

      // 4. Items List
      bill.billItems.forEach((item, idx) => {
        const indexStr = `${(idx + 1).toString().padEnd(3)}`;
        const nameStr = item.batch.product.name.substring(0, 22).padEnd(22);
        const batchStr = item.batch.batchNumber.substring(0, 12).padEnd(12);
        
        const expiryDate = new Date(item.batch.expiryDate);
        const expMonth = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
        const expYear = expiryDate.getFullYear().toString().substring(2);
        const expStr = `${expMonth}/${expYear}`.padEnd(6);
        
        const qtyStr = item.quantity.toString().padStart(6);
        const priceStr = item.sellingPrice.toFixed(2).padStart(8);
        const mrpStr = item.mrp.toFixed(2).padStart(8);
        const totalStr = item.totalAmount.toFixed(2).padStart(9);
        
        lines.push(indexStr + nameStr + batchStr + " " + expStr + " " + qtyStr + " " + priceStr + " " + mrpStr + " " + totalStr);
      });
      lines.push(separator());

      // 5. Totals block
      const goodsValLabel = "Goods Value:".padEnd(20) + bill.totalAmount.toFixed(2).padStart(12);
      lines.push(padLeftRight(`  ${bill.netAmount.toFixed(2)}`, goodsValLabel));
      
      const discountPercentage = ((bill.discountAmount / bill.totalAmount) * 100) || 0;
      const discLabel = `Discount:      ${discountPercentage.toFixed(1)} %`.padEnd(20) + bill.discountAmount.toFixed(2).padStart(12);
      lines.push(padLeftRight("", discLabel));
      
      // Calculate Round Off
      const grossTotal = bill.totalAmount - bill.discountAmount + bill.gstAmount;
      const roundOff = bill.netAmount - grossTotal;
      const roundOffLabel = "Rounded Off:".padEnd(20) + roundOff.toFixed(2).padStart(12);
      lines.push(padLeftRight("", roundOffLabel));
      
      const billAmtLabel = "Bill Amount:".padEnd(20) + bill.netAmount.toFixed(2).padStart(12);
      lines.push(padLeftRight("", billAmtLabel));

      // 6. Footer
      lines.push("");
      lines.push(center("***Wish You A Speedy Recovery***"));

      return lines.join('\n');
    }

    const width = widthType === '58mm' ? 32 : (widthType === '80mm' ? 48 : 88);

    const lines: string[] = [];

    // Formatter helpers
    const center = (text: string) => {
      const pad = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(pad) + text;
    };

    const separator = () => '-'.repeat(width);
    const doubleSeparator = () => '='.repeat(width);

    const padLeftRight = (left: string, right: string) => {
      const spacing = width - left.length - right.length;
      if (spacing <= 0) return left.substring(0, width - right.length - 1) + ' ' + right;
      return left + ' '.repeat(spacing) + right;
    };

    // 1. Header
    lines.push(center(settings?.storeName?.toUpperCase() || "MEDINGEN PHARMACY"));
    if (settings?.address) {
      lines.push(center(settings.address));
    }
    if (settings?.phone) {
      lines.push(center(`Ph: ${settings.phone}`));
    }
    lines.push(separator());

    // 2. Metadata
    lines.push(`Invoice #: ${bill.billNumber}`);
    lines.push(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
    lines.push(`Cashier: ADMIN`);
    lines.push(`Customer: ${bill.customer?.name || 'Registered Customer'}`);
    lines.push(`Mobile: ${bill.customer?.mobile || '-'}`);
    lines.push(`Doctor: ${bill.doctorName || 'Self / Referral'}`);
    lines.push(separator());

    // 3. Items list
    if (widthType === '58mm') {
      // 58mm format: line 1 product name, line 2 qty x price = total
      lines.push("Item Description");
      lines.push(padLeftRight("  Qty x Price", "Amount"));
      lines.push(separator());
      bill.billItems.forEach((item) => {
        const prodName = item.batch.product.name;
        lines.push(prodName.substring(0, width));
        const details = `  ${item.quantity} x ₹${item.sellingPrice.toFixed(2)}`;
        const totalStr = `₹${item.totalAmount.toFixed(2)}`;
        lines.push(padLeftRight(details, totalStr));
      });
    } else if (widthType === '80mm') {
      // 80mm format: Table column headings
      lines.push(padLeftRight("Item Name (Batch)", "Qty x Price      Amount"));
      lines.push(separator());
      bill.billItems.forEach((item) => {
        const prodName = `${item.batch.product.name} (${item.batch.batchNumber})`;
        const leftCol = prodName.substring(0, 22);
        const rightCol = `${item.quantity.toString().padStart(3)} x ₹${item.sellingPrice.toFixed(2).padEnd(6)}  ₹${item.totalAmount.toFixed(2).padStart(7)}`;
        lines.push(padLeftRight(leftCol, rightCol));
      });
    } else {
      // 150x95mm format: Full tabular columns (width: 88 chars)
      const headerRight = `${"Expiry".padEnd(10)} ${"Qty".padStart(6)} ${"Price".padStart(12)} ${"Amount".padStart(14)}`;
      lines.push(padLeftRight("Item Name (Batch)", headerRight));
      lines.push(separator());
      bill.billItems.forEach((item) => {
        const prodName = `${item.batch.product.name} (${item.batch.batchNumber})`;
        const leftCol = prodName.substring(0, 36).padEnd(36);
        const expiryStr = new Date(item.batch.expiryDate).toLocaleDateString('en-GB').padEnd(10);
        const qtyStr = item.quantity.toString().padStart(6);
        const priceStr = `₹${item.sellingPrice.toFixed(2)}`.padStart(12);
        const totalStr = `₹${item.totalAmount.toFixed(2)}`.padStart(14);
        
        const rightCol = `${expiryStr} ${qtyStr} ${priceStr} ${totalStr}`;
        lines.push(padLeftRight(leftCol, rightCol));
      });
    }
    lines.push(doubleSeparator());

    // 4. Totals
    lines.push(padLeftRight("Subtotal:", `₹${bill.totalAmount.toFixed(2)}`));
    if (bill.discountAmount > 0) {
      lines.push(padLeftRight("Discount Amount:", `-₹${bill.discountAmount.toFixed(2)}`));
    }
    lines.push(padLeftRight("GST Amount:", `₹${bill.gstAmount.toFixed(2)}`));
    lines.push(doubleSeparator());
    lines.push(padLeftRight("GRAND TOTAL:", `₹${bill.netAmount.toFixed(2)}`));
    lines.push(doubleSeparator());

    // 5. Payment Details
    lines.push("PAYMENT SPLIT:");
    if (bill.payments.length > 0) {
      bill.payments.forEach((pay) => {
        const payStr = `${pay.method}${pay.referenceNumber ? ` (${pay.referenceNumber})` : ''}`;
        lines.push(padLeftRight(`  - ${payStr}:`, `₹${pay.amount.toFixed(2)}`));
      });
    } else {
      lines.push(padLeftRight(`  - ${bill.paymentMethod}:`, `₹${bill.netAmount.toFixed(2)}`));
    }
    lines.push(separator());

    // 6. Tax Info
    const cgst = bill.gstAmount / 2;
    lines.push(center("TAX SUMMARY (SGST 50% / CGST 50%)"));
    lines.push(padLeftRight("  CGST Amount:", `₹${cgst.toFixed(2)}`));
    lines.push(padLeftRight("  SGST Amount:", `₹${cgst.toFixed(2)}`));
    lines.push(separator());

    // 7. Footer
    lines.push(center("Thank you for choosing Medingen!"));
    lines.push(center("Medicines once sold cannot be returned."));
    lines.push(center("Get Well Soon!"));

    return lines.join('\n');
  }
}
