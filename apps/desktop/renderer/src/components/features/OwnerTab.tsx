import React from 'react';

interface OwnerTabProps {
  dashboardStats: any;
  syncStatus: any;
}

export const OwnerTab: React.FC<OwnerTabProps> = ({
  dashboardStats,
  syncStatus,
}) => {
  if (!dashboardStats || !syncStatus) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Loading Owner Remote View...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div>
        <h2 className="text-xl font-bold text-white">Owner Remote Web Portal (Cloud Emulator)</h2>
        <p className="text-xs text-slate-400">Owner-only real-time revenue collection charts and live store statistics</p>
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-550 block mb-1 uppercase">Store Sync Status</span>
          <span className="font-bold text-teal-400 text-base">LAST SYNC: {syncStatus.lastSuccessfulSync ? new Date(syncStatus.lastSuccessfulSync).toLocaleTimeString() : 'NEVER'}</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-555 block mb-1 uppercase">Live Daily Revenue</span>
          <span className="font-bold text-emerald-450 text-lg">₹{dashboardStats.revenue?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-555 block mb-1 uppercase">Today's Transactions</span>
          <span className="font-bold text-white text-lg">{dashboardStats.totalBills || 0} bills</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-555 block mb-1 uppercase">Net Margin Profit</span>
          <span className="font-bold text-white text-lg">₹{dashboardStats.profit?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Extra telemetry info */}
      <div className="bg-slate-900/25 border border-slate-900 p-5 rounded-xl text-xs space-y-3 max-w-lg">
        <h3 className="font-bold text-white uppercase text-sm border-b border-slate-850 pb-2">Register Heartbeat Telemetry</h3>
        <div className="flex justify-between border-b border-slate-850/40 pb-1">
          <span className="text-slate-450">Local Database:</span>
          <span className="font-bold text-emerald-400">PostgreSQL (Healthy)</span>
        </div>
        <div className="flex justify-between border-b border-slate-850/40 pb-1">
          <span className="text-slate-450">Sync interval timers:</span>
          <span>15 seconds interval</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-450">Active license:</span>
          <span className="font-mono text-emerald-400 font-bold">ENTERPRISE_EDITION</span>
        </div>
      </div>
    </div>
  );
};
export default OwnerTab;
