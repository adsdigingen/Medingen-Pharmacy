import React from 'react';
import { DataTable, Column } from '../common/DataTable';
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
}) => {
  const columns: Column<any>[] = [
    {
      header: 'Invoice #',
      accessor: (row) => <span className="font-mono font-bold text-primary">{row.billNumber}</span>,
      exportValue: (row) => row.billNumber
    },
    {
      header: 'Customer Details',
      accessor: (row) => (
        <div>
          <span className="font-bold text-gray-700 block">{row.customer?.name || 'Walk-in Customer'}</span>
          {row.customer?.mobile && <span className="text-[10px] text-gray-500 font-mono block">Mob: {row.customer.mobile}</span>}
        </div>
      ),
      exportValue: (row) => row.customer?.name || 'Walk-in'
    },
    {
      header: 'Payment Mode',
      accessor: (row) => <span className="font-semibold">{row.paymentMethod}</span>,
      exportValue: (row) => row.paymentMethod
    },
    {
      header: 'Date & Time',
      accessor: (row) => <span>{new Date(row.createdAt).toLocaleString()}</span>,
      exportValue: (row) => new Date(row.createdAt).toLocaleString()
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
      exportValue: (row) => row.status
    },
    {
      header: 'Net Total',
      accessor: (row) => <span className="font-bold font-mono text-gray-800">₹{(row.netAmount || 0).toFixed(2)}</span>,
      exportValue: (row) => `₹${row.netAmount}`
    },
    {
      header: 'Actions',
      accessor: (row) => (
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
                    <th key={i} className={`py-2.5 px-4 ${c.header === 'Actions' || c.header === 'Net Total' ? 'text-right' : ''}`}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/10 transition-colors">
                    {columns.map((c, i) => (
                      <td key={i} className={`py-2.5 px-4 ${c.header === 'Actions' || c.header === 'Net Total' ? 'text-right' : ''}`}>{c.accessor(inv)}</td>
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
