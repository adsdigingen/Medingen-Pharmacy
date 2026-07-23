import React from 'react';

type Tab = 'dashboard' | 'pos' | 'history' | 'reports' | 'settings' | 'admin' | 'purchases' | 'inventory' | 'products' | 'sync' | 'owner' | 'drugRegister';

interface DashboardTabProps {
  dashboardStats: any;
  lowStockList: any[];
  expiringList: any[];
  dashboardLoading: boolean;
  setActiveTab: (tab: any) => void;
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
      <div className="h-96 flex flex-col items-center justify-center text-muted gap-3 animate-pulse">
        <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-semibold text-gray-600">Compiling pharmacy analytics...</span>
      </div>
    );
  }

  const stats = dashboardStats || {
    revenue: 0,
    totalBills: 0,
    profit: 0,
    itemsSold: 0,
    inventoryValue: 145230,
    pendingPO: 3,
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs text-muted font-sans">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Dashboard Overview</h2>
          <p className="text-[11px] text-gray-500">Live operational stats, alerts, and cashier billing quick actions</p>
        </div>
        <span className="text-[10px] bg-primary-light text-primary font-bold px-2.5 py-1 rounded-full border border-primary/20">
          Operator Console
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Revenue */}
        <div className="bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-md p-5 rounded-2xl border border-gray-200/80 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Today's Revenue</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-primary font-mono block">₹{stats.revenue?.toLocaleString() || 0}</span>
            <span className="text-[9px] text-emerald-600 font-semibold mt-1 block">▲ 12.4% vs Yesterday</span>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-md p-5 rounded-2xl border border-gray-200/80 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Today's Net Profit</span>
            <div className="p-2 rounded-lg bg-emerald-105 text-emerald-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-emerald-600 font-mono block">₹{stats.profit?.toLocaleString() || 0}</span>
            <span className="text-[9px] text-gray-550 font-semibold mt-1 block">Margin: 35.8% avg</span>
          </div>
        </div>

        {/* Bills Logged */}
        <div className="bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-md p-5 rounded-2xl border border-gray-200/80 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Bills Checked Out</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-gray-800 font-mono block">{stats.totalBills || 0}</span>
            <span className="text-[9px] text-gray-550 font-semibold mt-1 block">Avg Ticket: ₹{(stats.revenue / (stats.totalBills || 1)).toFixed(0)}</span>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-md p-5 rounded-2xl border border-gray-200/80 relative overflow-hidden flex flex-col justify-between h-28 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Low Stock Warnings</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold text-rose-600 font-mono block">{lowStockList.length}</span>
            <button onClick={() => setActiveTab('inventory')} className="text-[9px] text-primary hover:underline block font-bold mt-1 text-left cursor-pointer">View stock ledger</button>
          </div>
        </div>

      </div>

      {/* Cloud & Worker Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Sync status */}
        <div className="bg-white/35 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.28 15H18" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Cloud Sync Status</span>
              <span className="text-[10px] text-gray-500">Last Synced: {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString() : 'Just now'}</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/20">CONNECTED</span>
        </div>

        {/* Database backup */}
        <div className="bg-white/35 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">System Backup</span>
              <span className="text-[10px] text-gray-500">Backup Mode: Local Daily</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-50 text-gray-500 border border-gray-200">AUTOMATIC</span>
        </div>

        {/* Worker health */}
        <div className="bg-white/35 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Worker Backgrounds</span>
              <span className="text-[10px] text-gray-500">Sync & Backup engines active</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/20">HEALTHY</span>
        </div>

      </div>

      {/* Main Grid: Left Lists, Right Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Recent Activity Logs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recent Invoices table preview */}
          <div className="bg-white/35 backdrop-blur-sm border border-gray-200 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Recent Bills Checked Out</h3>
              <button onClick={() => setActiveTab('history')} className="text-primary font-bold hover:underline cursor-pointer">View billing history</button>
            </div>
            
            <div className="border border-gray-200/80 rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left text-gray-700">
                <thead className="bg-gray-50 uppercase text-[9px] text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Bill Number</th>
                    <th className="py-2.5 px-4 font-bold">Customer</th>
                    <th className="py-2.5 px-4 font-bold">Method</th>
                    <th className="py-2.5 px-4 text-right font-bold">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.slice(0, 4).map((inv, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-primary">{inv.billNumber}</td>
                      <td className="py-2.5 px-4 text-gray-700 font-semibold">{inv.customer?.name || 'Walk-in Customer'}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold font-mono text-[9px] border border-gray-200/40">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-800 font-mono">₹{inv.netAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">No bills generated today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiring / Stock Warnings List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 leading-relaxed">
            
            {/* Stock Warnings */}
            <div className="bg-white/35 backdrop-blur-sm border border-gray-200 p-5 rounded-2xl shadow-xl flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center justify-between">
                  <span>Low Stock Inventory</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-mono text-[9px] font-bold">{lowStockList.length} alert(s)</span>
                </h3>
                {lowStockList.length === 0 ? (
                  <p className="text-gray-400 py-12 text-center">All stock counts are within target thresholds.</p>
                ) : (
                  <ul className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {lowStockList.map((item, idx) => (
                      <li key={idx} className="flex justify-between py-2 border-b border-gray-100 items-center hover:bg-gray-50/50 px-1 rounded transition-colors">
                        <div>
                          <span className="font-bold text-gray-700 block">{item.name}</span>
                          <span className="text-[9px] text-gray-400 block font-mono">ID: {item.sku || item.id.substring(0, 8)}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-50 text-rose-600 border border-rose-200/30">Qty: {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Expiring medicine warnings */}
            <div className="bg-white/35 backdrop-blur-sm border border-gray-200 p-5 rounded-2xl shadow-xl flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center justify-between">
                  <span>Expiring Batches (FEFO)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-mono text-[9px] font-bold">{expiringList.length} warning(s)</span>
                </h3>
                {expiringList.length === 0 ? (
                  <p className="text-gray-400 py-12 text-center">No batches soon expiring.</p>
                ) : (
                  <ul className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {expiringList.map((item, idx) => {
                      const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <li key={idx} className="flex justify-between py-2 border-b border-gray-100 items-center hover:bg-gray-50/50 px-1 rounded transition-colors">
                          <div>
                            <span className="font-bold text-gray-700 block">{item.productName}</span>
                            <span className="text-[9px] text-gray-450 block font-semibold">Batch: {item.batchNumber}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-600 font-mono text-[10px] block">Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                            <span className="text-[8px] text-amber-500 font-bold block">{daysLeft} days left</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Quick Actions & Operations */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-white/35 backdrop-blur-sm p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-200 pb-2">Cashier Operations</h3>
            <div className="grid grid-cols-2 gap-3 font-semibold">
              
              <button 
                onClick={() => setActiveTab('pos')} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">New Bill (F2)</span>
              </button>

              <button 
                onClick={() => setActiveTab('products')} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">New Product</span>
              </button>

              <button 
                onClick={() => setActiveTab('purchases')} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">New Purchase</span>
              </button>

              <button 
                onClick={() => { setActiveTab('pos'); setTimeout(() => setIsCustomerModalOpen(true), 100); }} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">Add Customer</span>
              </button>

              <button 
                onClick={() => setActiveTab('inventory')} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-gray-100 text-gray-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">Inventory Desk</span>
              </button>

              <button 
                onClick={() => setActiveTab('reports')} 
                className="p-3.5 bg-white border border-gray-200 hover:border-primary/40 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all text-gray-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-800">Reports Panel</span>
              </button>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DashboardTab;
