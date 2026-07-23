import React, { useState } from 'react';
import { Column } from '../common/DataTable';
import { Badge } from '../common/Badge';

interface HistoryTabProps {
  invoices: any[];
  invoiceTotal: number;
  invoicePage: number;
  invoiceLimit: number;
  invoiceSearch: string;
  setInvoiceSearch: (val: string) => void;
  invoiceStatusFilter: string;
  setInvoiceStatusFilter: (val: string) => void;
  invoiceLoading: boolean;
  setInvoicePage: React.Dispatch<React.SetStateAction<number>>;
  setInvoiceDetail: (val: any) => void;
  handleFetchReceipt: (id: string) => Promise<void>;
  setIsCancelModalOpen: (val: boolean) => void;
  handleOpenSalesReturnModal: (bill: any) => void;
  settingsForm?: any;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  invoices,
  invoiceTotal,
  invoicePage,
  invoiceLimit,
  invoiceSearch,
  setInvoiceSearch,
  invoiceStatusFilter,
  setInvoiceStatusFilter,
  invoiceLoading,
  setInvoicePage,
  setInvoiceDetail,
  handleFetchReceipt,
  setIsCancelModalOpen,
  handleOpenSalesReturnModal,
  settingsForm,
}) => {
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (invoices.length === 0) return;
    const allCurrentIds = invoices.map(inv => inv.id);
    const allSelectedOnPage = allCurrentIds.every(id => selectedInvoiceIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedInvoiceIds(prev => prev.filter(id => !allCurrentIds.includes(id)));
    } else {
      setSelectedInvoiceIds(prev => {
        const union = new Set([...prev, ...allCurrentIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkPrintA4 = () => {
    const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (selectedInvoices.length === 0) return;

    const storeName = settingsForm?.storeName || 'Medingen Pharmacy';
    const storeAddress = settingsForm?.address || '';
    const storePhone = settingsForm?.phone || '';
    const storeGtin = settingsForm?.gstin || '';

    // Split selected invoices into chunks of 4
    const chunks: any[][] = [];
    for (let i = 0; i < selectedInvoices.length; i += 4) {
      chunks.push(selectedInvoices.slice(i, i + 4));
    }

    let htmlContent = `
<html>
<head>
  <title>Bulk Print Invoices (A4)</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-after: always;
      }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .a4-page {
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      padding: 10mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 8mm;
      page-break-after: always;
    }
    .a4-page:last-child {
      page-break-after: avoid;
    }
    .bill-box {
      border: 1px dashed #666;
      border-radius: 4px;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 133mm;
      box-sizing: border-box;
      overflow: hidden;
    }
    .header {
      text-align: center;
      margin-bottom: 2px;
    }
    .store-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      margin: 3px 0;
      font-size: 9px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    .items-table th {
      border-bottom: 1px dashed #000;
      text-align: left;
      font-weight: bold;
      padding-bottom: 2px;
    }
    .items-table td {
      padding: 2px 0;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 5px;
      font-size: 9px;
    }
    .payment-info {
      font-weight: bold;
      text-transform: uppercase;
    }
    .totals-table {
      width: 60%;
      margin-left: auto;
    }
    .totals-table td {
      padding: 1px 0;
    }
    .net-payable {
      font-size: 11px;
      font-weight: bold;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 2px 0;
    }
    .footer-msg {
      text-align: center;
      font-size: 8px;
      margin-top: 4px;
      color: #555;
    }
    .empty-box {
      border: none;
      height: 133mm;
    }
  </style>
</head>
<body>
`;

    chunks.forEach((chunk) => {
      htmlContent += `<div class="a4-page">`;
      for (let i = 0; i < 4; i++) {
        if (i < chunk.length) {
          const inv = chunk[i];
          const invoiceDate = new Date(inv.createdAt).toLocaleString();
          const customerName = inv.customer?.name || 'Walk-in Customer';
          const customerMobile = inv.customer?.mobile || '-';
          
          let gross = 0;
          let disc = 0;
          let tax = 0;
          inv.billItems.forEach((it: any) => {
            const qty = it.quantity || 0;
            const price = it.customPrice || it.sellingPrice || 0;
            const lineSub = qty * price;
            const lineDisc = lineSub * ((it.discountPercentage || 0) / 100);
            const lineTax = (lineSub - lineDisc) * ((it.gstPercentage || 0) / 100);
            gross += lineSub;
            disc += lineDisc;
            tax += lineTax;
          });

          htmlContent += `
        <div class="bill-box">
          <div>
            <div class="header">
              <div class="store-title">${storeName}</div>
              ${storeAddress ? `<div>${storeAddress}</div>` : ''}
              ${storePhone ? `<div>Ph: ${storePhone}</div>` : ''}
            </div>
            
            <div class="divider"></div>
            
            <div class="meta-grid">
              <div>
                <strong>Inv #:</strong> ${inv.billNumber}<br/>
                <strong>Date:</strong> ${invoiceDate}
              </div>
              <div class="text-right">
                <strong>Cust:</strong> ${customerName} (Ph: ${customerMobile})<br/>
                <strong>Doc :</strong> ${inv.doctorName || 'Self / Referral'}
              </div>
            </div>
            
            <div class="divider"></div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 45%;">Medicine</th>
                  <th style="width: 20%;">Batch</th>
                  <th style="width: 10%;" class="text-center">Qty</th>
                  <th style="width: 12.5%;" class="text-right">Rate</th>
                  <th style="width: 12.5%;" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
          `;

          inv.billItems.forEach((it: any) => {
            const prodName = it.batch?.product?.name || 'Unknown Item';
            const batchNum = it.batch?.batchNumber || '-';
            const price = it.customPrice || it.sellingPrice || 0;
            const lineSub = it.quantity * price;
            const lineDisc = lineSub * ((it.discountPercentage || 0) / 100);
            const lineTax = (lineSub - lineDisc) * ((it.gstPercentage || 0) / 100);
            const total = lineSub - lineDisc + lineTax;

            htmlContent += `
                <tr>
                  <td>${prodName.substring(0, 20)}</td>
                  <td>${batchNum}</td>
                  <td class="text-center">${it.quantity}</td>
                  <td class="text-right">${price.toFixed(2)}</td>
                  <td class="text-right">${total.toFixed(2)}</td>
                </tr>
            `;
          });

          htmlContent += `
              </tbody>
            </table>
          </div>
          
          <div>
            <div class="divider"></div>
            
            <div class="totals-box">
              <div class="payment-info">
                Mode: ${inv.paymentMethod}<br/>
                Status: ${inv.status}
              </div>
              <table class="totals-table">
                <tr>
                  <td>Gross Amt:</td>
                  <td class="text-right">₹${gross.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Discount:</td>
                  <td class="text-right">-₹${disc.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>GST Tax:</td>
                  <td class="text-right">₹${tax.toFixed(2)}</td>
                </tr>
                <tr class="net-payable">
                  <td><strong>Net Amt:</strong></td>
                  <td class="text-right"><strong>₹${(inv.netAmount || 0).toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>
            
            <div class="footer-msg">
              Thank You! Get Well Soon.
            </div>
          </div>
        </div>
          `;
        } else {
          htmlContent += `<div class="bill-box empty-box"></div>`;
        }
      }
      htmlContent += `</div>`;
    });

    htmlContent += `
</body>
</html>
`;

    const printWin = window.open('', '_blank', 'width=900,height=600');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 500);
    }
  };

  const columns: any[] = [
    {
      header: (
        <input 
          type="checkbox" 
          checked={invoices.length > 0 && invoices.every(inv => selectedInvoiceIds.includes(inv.id))}
          onChange={toggleSelectAll}
          className="w-3.5 h-3.5 cursor-pointer rounded accent-primary"
        />
      ),
      accessor: (row: any) => (
        <input 
          type="checkbox" 
          checked={selectedInvoiceIds.includes(row.id)}
          onChange={() => toggleSelectInvoice(row.id)}
          className="w-3.5 h-3.5 cursor-pointer rounded accent-primary"
        />
      ),
      exportValue: () => ''
    },
    {
      header: 'Invoice #',
      accessor: (row: any) => <span className="font-mono font-bold text-primary">{row.billNumber}</span>,
      exportValue: (row: any) => row.billNumber
    },
    {
      header: 'Customer Details',
      accessor: (row: any) => (
        <div>
          <span className="font-bold text-gray-700 block">{row.customer?.name || 'Walk-in Customer'}</span>
          {row.customer?.mobile && <span className="text-[10px] text-gray-500 font-mono block">Mob: {row.customer.mobile}</span>}
        </div>
      ),
      exportValue: (row: any) => row.customer?.name || 'Walk-in'
    },
    {
      header: 'Payment Mode',
      accessor: (row: any) => <span className="font-semibold">{row.paymentMethod}</span>,
      exportValue: (row: any) => row.paymentMethod
    },
    {
      header: 'Date & Time',
      accessor: (row: any) => <span>{new Date(row.createdAt).toLocaleString()}</span>,
      exportValue: (row: any) => new Date(row.createdAt).toLocaleString()
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
      exportValue: (row: any) => row.status
    },
    {
      header: 'Net Total',
      accessor: (row: any) => <span className="font-bold font-mono text-gray-800">₹{(row.netAmount || 0).toFixed(2)}</span>,
      exportValue: (row: any) => `₹${row.netAmount}`
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex gap-2 justify-end font-bold text-[10px]">
          <button onClick={() => setInvoiceDetail(row)} className="text-primary hover:underline cursor-pointer">View</button>
          <button onClick={() => handleFetchReceipt(row.id)} className="text-gray-600 hover:underline cursor-pointer">Receipt</button>
          {row.status === 'COMPLETED' && (
            <>
              <button onClick={() => { setInvoiceDetail(row); setIsCancelModalOpen(true); }} className="text-rose-600 hover:underline cursor-pointer">Cancel</button>
              <button onClick={() => handleOpenSalesReturnModal(row)} className="text-amber-500 hover:underline cursor-pointer">Return</button>
            </>
          )}
        </div>
      ),
      exportValue: () => ''
    }
  ];

  const totalPages = Math.max(1, Math.ceil(invoiceTotal / invoiceLimit));

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs text-muted">
      
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Invoice Registers</h2>
        <p className="text-[11px] text-gray-500 font-medium">Verify daily checkouts, print duplicate thermal receipts, or process customer returns</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/20 border border-gray-200 p-4 rounded-2xl text-xs shadow-lg items-center">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
            placeholder="Search by invoice number or customer mobile..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none"
          />
          <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div>
          <select
            value={invoiceStatusFilter}
            onChange={(e) => { setInvoiceStatusFilter(e.target.value); setInvoicePage(1); }}
            className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-slate-250 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed Checkouts</option>
            <option value="CANCELLED">Cancelled Offset Invoices</option>
          </select>
        </div>
      </div>

      {/* Bulk Print Action Panel */}
      {selectedInvoiceIds.length > 0 && (
        <div className="flex justify-between items-center bg-primary/10 border border-primary/20 p-3 rounded-xl animate-fadeIn">
          <span className="font-semibold text-primary">Selected {selectedInvoiceIds.length} bills for bulk operations</span>
          <div className="flex gap-2 font-semibold">
            <button
              onClick={handleBulkPrintA4}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-white font-bold transition-all cursor-pointer shadow-md text-[11px]"
            >
              Bulk Print (A4 Grid - 4 per page)
            </button>
            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-800 transition-all cursor-pointer text-[11px]"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {invoiceLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted gap-3 animate-pulse">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Querying invoice database...</span>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white/10">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-gray-600">
              <thead className="bg-white/60 uppercase text-[9px] text-gray-500 border-b border-gray-200">
                <tr>
                  {columns.map((c, i) => (
                    <th key={i} className={`py-2.5 px-4 ${c.header === 'Actions' || c.header === 'Net Total' ? 'text-right' : ''}`}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/10 transition-colors">
                    {columns.map((c, i) => (
                      <td key={i} className={`py-2.5 px-4 ${c.header === 'Actions' || c.header === 'Net Total' ? 'text-right' : ''}`}>
                        {c.accessor(inv)}
                      </td>
                    ))}
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-slate-600 font-bold uppercase tracking-wider">No matching transaction records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          {invoiceTotal > invoiceLimit && (
            <div className="flex items-center justify-between px-6 py-4 bg-white/40 border-t border-gray-200 text-xs">
              <span className="text-gray-500">Total {invoiceTotal} invoices</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setInvoicePage(p => Math.max(1, p - 1))} 
                  disabled={invoicePage === 1} 
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-700 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                >
                  Prev
                </button>
                <span className="px-3.5 py-1.5 font-bold font-mono text-gray-600 bg-gray-50 rounded-lg flex items-center border border-gray-200">
                  Page {invoicePage} of {totalPages}
                </span>
                <button 
                  onClick={() => setInvoicePage(p => p + 1)} 
                  disabled={invoicePage >= totalPages} 
                  className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-700 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default HistoryTab;
