import React, { useMemo } from 'react';

interface ReportsTabProps {
  reportsTab: 'sales' | 'purchases' | 'gst' | 'stock';
  setReportsTab: (val: 'sales' | 'purchases' | 'gst' | 'stock') => void;
  reportsStartDate: string;
  setReportsStartDate: (val: string) => void;
  reportsEndDate: string;
  setReportsEndDate: (val: string) => void;
  salesReportData: any;
  purchaseReportData: any;
  gstReportData: any;
  reportsLoading: boolean;
  fetchReportsData: () => Promise<void>;
  exportToCSV: (data: any[], filename: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  reportsTab,
  setReportsTab,
  reportsStartDate,
  setReportsStartDate,
  reportsEndDate,
  setReportsEndDate,
  salesReportData,
  purchaseReportData,
  gstReportData,
  reportsLoading,
  fetchReportsData,
  exportToCSV,
}) => {

  // Custom Interactive SVG Line Chart for Sales Trend
  const renderSalesTrendChart = useMemo(() => {
    if (!salesReportData || !salesReportData.items || salesReportData.items.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-600 bg-white/20 border border-gray-200 rounded-2xl">
          Generate a report range to display Sales Trend line chart
        </div>
      );
    }

    // Group sales by date
    const groups: Record<string, number> = {};
    salesReportData.items.forEach((it: any) => {
      const date = new Date(it.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      groups[date] = (groups[date] || 0) + it.netAmount;
    });

    const dates = Object.keys(groups);
    const values = Object.values(groups);
    const maxVal = Math.max(...values, 100);

    // Create coordinates for SVG path
    const width = 500;
    const height = 150;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = dates.map((date, idx) => {
      const x = padding + (idx / Math.max(dates.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - (groups[date] / maxVal) * chartHeight;
      return { x, y, label: date, val: groups[date] };
    });

    let pathD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    return (
      <div className="bg-white/35 border border-gray-200 p-5 rounded-2xl space-y-4">
        <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wider block">Sales Revenue Trend Line</span>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Horizontal grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1F2937" strokeDasharray="3" />
          <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="#1F2937" strokeDasharray="3" />
          <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="#1F2937" />

          {/* Trend line */}
          {points.length > 0 && (
            <>
              <path d={pathD} fill="none" stroke="url(#salesGrad)" strokeWidth="3" strokeLinecap="round" />
              {/* Area under curve */}
              <path 
                d={`${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`} 
                fill="url(#areaGrad)" 
              />
            </>
          )}

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4" className="fill-teal-500 stroke-slate-950 stroke-[2] hover:r-6 hover:fill-teal-400 transition-all" />
              {/* Tooltip on hover */}
              <text x={p.x} y={p.y - 8} className="fill-slate-200 text-[8px] font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity" textAnchor="middle">
                ₹{p.val}
              </text>
              {/* X Axis Date labels */}
              <text x={p.x} y={height - 8} className="fill-slate-500 text-[7px] font-mono" textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="salesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }, [salesReportData]);

  // Custom Interactive SVG Bar Chart for Purchases
  const renderPurchaseTrendChart = useMemo(() => {
    if (!purchaseReportData || !purchaseReportData.items || purchaseReportData.items.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-600 bg-gray-50/20 border border-gray-200 rounded-2xl">
          Generate a report range to display Purchase Trend bar chart
        </div>
      );
    }

    // Group purchases by date
    const groups: Record<string, number> = {};
    purchaseReportData.items.forEach((it: any) => {
      const date = new Date(it.purchaseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      groups[date] = (groups[date] || 0) + it.amount;
    });

    const dates = Object.keys(groups);
    const values = Object.values(groups);
    const maxVal = Math.max(...values, 100);

    const width = 500;
    const height = 150;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = Math.max(8, (chartWidth / (dates.length || 1)) - 6);

    return (
      <div className="bg-white/35 border border-gray-200 p-5 rounded-2xl space-y-4">
        <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wider block">PO Value Allocation Chart</span>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Horizontal lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1F2937" strokeDasharray="3" />
          <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="#1F2937" />

          {/* Bar elements */}
          {dates.map((date, idx) => {
            const val = groups[date];
            const barHeight = (val / maxVal) * chartHeight;
            const x = padding + (idx / Math.max(dates.length, 1)) * chartWidth + 3;
            const y = padding + chartHeight - barHeight;

            return (
              <g key={idx} className="group cursor-pointer">
                <rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  className="fill-teal-500 hover:fill-teal-400 rounded-t-sm transition-colors" 
                />
                <text x={x + barWidth / 2} y={y - 6} className="fill-slate-200 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" textAnchor="middle">
                  ₹{val.toFixed(0)}
                </text>
                <text x={x + barWidth / 2} y={height - 8} className="fill-slate-500 text-[7px] font-mono" textAnchor="middle">
                  {date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }, [purchaseReportData]);

  // Custom Interactive SVG Donut Chart for GST Reports
  const renderGSTDonutChart = useMemo(() => {
    if (!gstReportData) return null;

    const salesTax = gstReportData.sales?.outputGst || 0;
    const purchaseTax = gstReportData.purchases?.inputGst || 0;
    const totalTax = salesTax + purchaseTax || 10;

    const salesPercentage = (salesTax / totalTax) * 100;
    const purchasePercentage = (purchaseTax / totalTax) * 100;

    // SVG parameters
    const size = 150;
    const center = size / 2;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffsetSales = circumference - (salesPercentage / 100) * circumference;

    return (
      <div className="bg-white/35 border border-gray-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-around gap-4">
        <div className="relative w-36 h-36">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#1F2937" strokeWidth="12" />
            
            {/* Sales Output Tax arc */}
            <circle 
              cx={center} 
              cy={center} 
              r={radius} 
              fill="none" 
              stroke="#14B8A6" 
              strokeWidth="12" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffsetSales}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">Net Output</span>
            <span className="text-sm font-extrabold text-gray-800 mt-1">₹{salesTax.toFixed(0)}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">GST Tax Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-gray-600">Output Tax (Sales): <span className="font-bold text-gray-800 font-mono">₹{salesTax.toFixed(2)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-100" />
              <span className="text-gray-600">Input Tax Credit (PO): <span className="font-bold text-gray-800 font-mono">₹{purchaseTax.toFixed(2)}</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [gstReportData]);

  // General printable window exporter for active reports
  const triggerPrintReport = () => {
    const printWin = window.open('', '', 'width=800,height=600');
    if (!printWin) return;

    let tableHTML = '';
    if (reportsTab === 'sales' && salesReportData) {
      tableHTML = `
        <h2>Sales Transaction Audit</h2>
        <table>
          <thead><tr><th>Bill Number</th><th>Customer</th><th>Method</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>
            ${salesReportData.items.map((it: any) => `
              <tr><td>${it.billNumber}</td><td>${it.customerName}</td><td>${it.paymentMethod}</td><td>${new Date(it.createdAt).toLocaleDateString()}</td><td>₹${it.netAmount}</td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportsTab === 'purchases' && purchaseReportData) {
      tableHTML = `
        <h2>Purchase Ledger Audit</h2>
        <table>
          <thead><tr><th>PO Number</th><th>Supplier</th><th>Status</th><th>Date</th><th>Amount</th></tr></thead>
          <tbody>
            ${purchaseReportData.items.map((it: any) => `
              <tr><td>${it.poNumber}</td><td>${it.supplierName}</td><td>${it.status}</td><td>${new Date(it.purchaseDate).toLocaleDateString()}</td><td>₹${it.amount.toFixed(2)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <html>
        <head>
          <title>Medingen Pharmacy ERP - Accounts Ledger Audit</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Medingen Pharmacy Ledger</h1>
          <p>Audited from ${reportsStartDate} to ${reportsEndDate}</p>
          ${tableHTML}
        </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    printWin.close();
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs text-muted">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Reports & Financial Analytics</h2>
          <p className="text-[11px] text-gray-500 font-medium">Generate accounts summaries, tax sheets, and sales statistics</p>
        </div>
        
        {/* Reports sub-tabs */}
        <div className="flex gap-1.5 bg-white/40 p-1.5 border border-gray-200 rounded-xl font-bold">
          <button onClick={() => setReportsTab('sales')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${reportsTab === 'sales' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'}`}>Sales Report</button>
          <button onClick={() => setReportsTab('purchases')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${reportsTab === 'purchases' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'}`}>Purchase Summary</button>
          <button onClick={() => setReportsTab('gst')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${reportsTab === 'gst' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'}`}>GST Reports</button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-4 bg-white/20 border border-gray-200 p-4 rounded-2xl text-xs items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <span className="text-gray-500 font-bold uppercase tracking-wider">Report Range:</span>
          <input type="date" value={reportsStartDate} onChange={(e) => setReportsStartDate(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 font-mono" />
          <span className="text-slate-600">to</span>
          <input type="date" value={reportsEndDate} onChange={(e) => setReportsEndDate(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 font-mono" />
          <button onClick={fetchReportsData} className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-slate-955 font-bold rounded-lg transition-all cursor-pointer">Generate</button>
        </div>

        <div className="flex gap-2">
          <button onClick={triggerPrintReport} className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-all cursor-pointer font-bold">Print Invoice Ledger</button>
          <button onClick={triggerPrintReport} className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-all cursor-pointer font-bold">Export PDF</button>
        </div>
      </div>

      {reportsLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted gap-3 animate-pulse">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Compiling accounting tables...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SALES REPORT DISPLAY */}
          {reportsTab === 'sales' && salesReportData && (
            <div className="space-y-6">
              
              {/* SVG Trend Chart */}
              {renderSalesTrendChart}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/40 p-5 rounded-2xl border border-gray-200 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Total Bills</span>
                  <span className="text-xl font-bold text-gray-800 font-mono">{salesReportData.summary.totalBills}</span>
                </div>
                <div className="bg-white/40 p-5 rounded-2xl border border-gray-200 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Revenue</span>
                  <span className="text-xl font-bold text-primary font-mono">₹{salesReportData.summary.revenue.toLocaleString()}</span>
                </div>
                <div className="bg-white/40 p-5 rounded-2xl border border-gray-200 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Total Tax (GST)</span>
                  <span className="text-xl font-bold text-gray-700 font-mono">₹{salesReportData.summary.gst.toLocaleString()}</span>
                </div>
                <div className="bg-white/40 p-5 rounded-2xl border border-gray-200 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block mb-1">Total Net Profit</span>
                  <span className="text-xl font-bold text-emerald-450 font-mono">₹{salesReportData.summary.profit.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Invoice Audit Trail ({salesReportData.items.length})</h3>
                <button onClick={() => exportToCSV(salesReportData.items, 'medingen_sales_report.csv')} className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-800 transition-all cursor-pointer font-bold">Export CSV</button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white/10">
                <table className="w-full text-left text-gray-600">
                  <thead className="bg-white/60 uppercase text-[9px] text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Customer Name</th>
                      <th className="py-2.5 px-4">Payment</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {salesReportData.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-white/10 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-primary">{it.billNumber}</td>
                        <td className="py-2.5 px-4 text-gray-700">{it.customerName}</td>
                        <td className="py-2.5 px-4 font-bold">{it.paymentMethod}</td>
                        <td className="py-2.5 px-4 text-gray-500">{new Date(it.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 text-right text-gray-800 font-bold font-mono">₹{it.netAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PURCHASE REPORT DISPLAY */}
          {reportsTab === 'purchases' && purchaseReportData && (
            <div className="space-y-6">
              
              {/* SVG Purchase Bar Chart */}
              {renderPurchaseTrendChart}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/40 p-5 rounded-2xl border border-gray-200 text-xs shadow-lg">
                <div>
                  <span className="text-gray-500 font-bold uppercase tracking-wider block">Total PO Invoices:</span>
                  <span className="font-extrabold text-gray-800 text-lg font-mono block mt-1">{purchaseReportData.totalPurchaseOrders}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold uppercase tracking-wider block">Cumulative Cost:</span>
                  <span className="font-extrabold text-primary text-lg font-mono block mt-1">₹{purchaseReportData.totalCost.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Purchase Invoices Audit ({purchaseReportData.items.length})</h3>
                <button onClick={() => exportToCSV(purchaseReportData.items, 'medingen_purchases_report.csv')} className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-800 transition-all cursor-pointer font-bold">Export CSV</button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white/10">
                <table className="w-full text-left text-slate-355">
                  <thead className="bg-white/60 uppercase text-[9px] text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">PO Number</th>
                      <th className="py-2.5 px-4">Supplier</th>
                      <th className="py-2.5 px-4">Order Date</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Cost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {purchaseReportData.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-white/10 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-primary">{it.poNumber}</td>
                        <td className="py-2.5 px-4 text-gray-700">{it.supplierName}</td>
                        <td className="py-2.5 px-4 text-gray-500">{new Date(it.purchaseDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 font-bold">{it.status}</td>
                        <td className="py-2.5 px-4 text-right text-gray-800 font-bold font-mono">₹{it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GST REPORT DISPLAY */}
          {reportsTab === 'gst' && gstReportData && (
            <div className="space-y-6">
              
              {/* GST Donut Split Chart */}
              {renderGSTDonutChart}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Output Tax Sales */}
                <div className="bg-white/25 border border-gray-200 p-5 rounded-2xl space-y-4 shadow-lg">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">Output Tax (Sales Summary)</h3>
                  <div className="flex justify-between border-b border-gray-200/45 pb-2.5">
                    <span>Taxable Sales Revenue:</span>
                    <span className="font-mono text-gray-700">₹{gstReportData.sales.taxableSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/45 pb-2.5">
                    <span>CGST (Central Tax 50%):</span>
                    <span className="font-mono text-slate-355">₹{gstReportData.sales.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span>SGST (State Tax 50%):</span>
                    <span className="font-mono text-slate-355">₹{gstReportData.sales.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 text-sm pt-1">
                    <span>Total Output GST:</span>
                    <span className="font-mono text-primary text-base">₹{gstReportData.sales.outputGst.toFixed(2)}</span>
                  </div>
                </div>

                {/* Input Tax Credit Purchases */}
                <div className="bg-white/25 border border-gray-200 p-5 rounded-2xl space-y-4 shadow-lg">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">Input Tax Credit (Purchases)</h3>
                  <div className="flex justify-between border-b border-gray-200/45 pb-2.5">
                    <span>Taxable Purchases Value:</span>
                    <span className="font-mono text-gray-700">₹{gstReportData.purchases.taxablePurchases.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/45 pb-2.5">
                    <span>Input CGST:</span>
                    <span className="font-mono text-slate-355">₹{gstReportData.purchases.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2.5">
                    <span>Input SGST:</span>
                    <span className="font-mono text-slate-355">₹{gstReportData.purchases.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 text-sm pt-1">
                    <span>Total Input GST:</span>
                    <span className="font-mono text-primary text-base">₹{gstReportData.purchases.inputGst.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ReportsTab;
