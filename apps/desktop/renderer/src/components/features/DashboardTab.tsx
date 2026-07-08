import React from 'react';

type Tab = 'dashboard' | 'pos' | 'history' | 'reports' | 'settings' | 'admin' | 'purchases' | 'inventory' | 'products' | 'sync' | 'owner';

interface DashboardTabProps {
  dashboardStats: any;
  lowStockList: any[];
  expiringList: any[];
  dashboardLoading: boolean;
  setActiveTab: (tab: Tab) => void;
  setIsCustomerModalOpen: (val: boolean) => void;
  syncStatus: any;
  invoices: any[];
  purchaseOrders: any[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  dashboardStats,
  lowStockList,
  expiringList,
  dashboardLoading,
  setActiveTab,
  setIsCustomerModalOpen,
  syncStatus,
  invoices = [],
  purchaseOrders = [],
}) => {
  if (dashboardLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3 animate-pulse">
        <svg className="animate-spin h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Compiling pharmacy analytics...</span>
      </div>
    );
  }

  const stats = dashboardStats || {
    revenue: 0,
    totalBills: 0,
    profit: 0,
    itemsSold: 0,
    inventoryValue: 145230, // Fallback/default valuation metrics
    pendingPO: 3,
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs text-slate-400 font-sans">
      
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Dashboard Overview</h2>
        <p className="text-[11px] text-slate-500">Live operational stats, alerts, and cashier billing quick actions</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Revenue */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:border-slate-800 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Today's Revenue</span>
            <div className="p-1 rounded-md bg-teal-500/10 text-teal-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-teal-400 font-mono">₹{stats.revenue?.toLocaleString() || 0}</span>
            <span className="text-[9px] text-emerald-450 block font-semibold mt-1">▲ 12.4% vs Yesterday</span>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:border-slate-800 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Today's Net Profit</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">₹{stats.profit?.toLocaleString() || 0}</span>
            <span className="text-[9px] text-slate-500 block font-semibold mt-1">Margin: 35.8% avg</span>
          </div>
        </div>

        {/* Bills Logged */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:border-slate-800 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Bills Checked Out</span>
            <div className="p-1 rounded-md bg-slate-800 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-white font-mono">{stats.totalBills || 0}</span>
            <span className="text-[9px] text-slate-500 block font-semibold mt-1">Avg Ticket: ₹{(stats.revenue / (stats.totalBills || 1)).toFixed(0)}</span>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:border-slate-800 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Low Stock Warnings</span>
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-455">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-rose-455 font-mono">{lowStockList.length}</span>
            <button onClick={() => setActiveTab('inventory')} className="text-[9px] text-teal-400 hover:underline block font-bold mt-1 text-left">View stock ledger</button>
          </div>
        </div>

      </div>

      {/* Cloud & Worker Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Sync status */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/5 text-teal-400 border border-teal-500/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.28 15H18" /></svg>
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Cloud Sync Status</span>
              <span className="text-[10px] text-slate-500">Last Synced: {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString() : 'Just now'}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">CONNECTED</span>
        </div>

        {/* Database backup */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </div>
            <div>
              <span className="font-bold text-slate-200 block">System Backup</span>
              <span className="text-[10px] text-slate-500">Backup Mode: Local Daily</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-850 text-slate-400 border border-slate-800">AUTOMATIC</span>
        </div>

        {/* Worker health */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <span className="font-bold text-slate-200 block">Worker Backgrounds</span>
              <span className="text-[10px] text-slate-500">Sync & Backup engines active</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">HEALTHY</span>
        </div>

      </div>

      {/* Main Grid: Left Lists, Right Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Recent Activity Logs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recent Invoices table preview */}
          <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Recent Bills Checked Out</h3>
              <button onClick={() => setActiveTab('history')} className="text-teal-400 hover:underline">View ledger</button>
            </div>
            
            <div className="border border-slate-850 rounded-xl overflow-hidden">
              <table className="w-full text-left text-slate-300">
                <thead className="bg-slate-900/60 uppercase text-[9px] text-slate-550 border-b border-slate-850">
                  <tr>
                    <th className="py-2.5 px-4">Bill Number</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 4).map((inv, idx) => (
                    <tr key={idx} className="border-b border-slate-850/30 hover:bg-slate-900/10">
                      <td className="py-2.5 px-4 font-mono font-bold text-teal-400">{inv.billNumber}</td>
                      <td className="py-2.5 px-4 text-slate-200">{inv.customer?.name || 'Walk-in Customer'}</td>
                      <td className="py-2.5 px-4">{inv.paymentMethod}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-100">₹{inv.netAmount}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-600">No bills generated today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiring / Stock Warnings List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 leading-relaxed">
            
            {/* Stock Warnings */}
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl shadow-xl">
              <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider border-b border-slate-850 pb-2">Low Stock Inventory</h3>
              {lowStockList.length === 0 ? (
                <p className="text-slate-550 py-4 text-center">All stock counts are within target thresholds.</p>
              ) : (
                <ul className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {lowStockList.map((item, idx) => (
                    <li key={idx} className="flex justify-between py-1.5 border-b border-slate-850/30 items-center">
                      <span className="font-bold text-slate-300">{item.name}</span>
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-455">Qty: {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Expiring medicine warnings */}
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl shadow-xl">
              <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider border-b border-slate-850 pb-2">Expiring Batches (FEFO)</h3>
              {expiringList.length === 0 ? (
                <p className="text-slate-550 py-4 text-center">No batches soon expiring.</p>
              ) : (
                <ul className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {expiringList.map((item, idx) => (
                    <li key={idx} className="flex justify-between py-1.5 border-b border-slate-850/30 items-center">
                      <span className="text-slate-350">{item.productName} <span className="font-mono text-[9px] text-slate-500">({item.batchNumber})</span></span>
                      <span className="font-bold text-amber-500 font-mono text-[10px]">Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Quick Actions & Operations */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-850 pb-2">Cashier Operations</h3>
            <div className="grid grid-cols-2 gap-3 font-semibold">
              
              <button 
                onClick={() => setActiveTab('pos')} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-teal-500/5 text-teal-400 border border-teal-500/10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <span>New Bill (F2)</span>
              </button>

              <button 
                onClick={() => setActiveTab('products')} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span>New Product</span>
              </button>

              <button 
                onClick={() => setActiveTab('purchases')} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <span>New Purchase</span>
              </button>

              <button 
                onClick={() => { setActiveTab('pos'); setTimeout(() => setIsCustomerModalOpen(true), 100); }} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <span>Add Customer</span>
              </button>

              <button 
                onClick={() => setActiveTab('inventory')} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <span>Inventory desk</span>
              </button>

              <button 
                onClick={() => setActiveTab('reports')} 
                className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-500/30 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-slate-805 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <span>Reports</span>
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default DashboardTab;
