import React from 'react';

interface SyncTabProps {
  syncStatus: any;
  syncConflicts: any[];
  syncLoading: boolean;
  triggerForceSync: () => Promise<void>;
  handleResolveConflict: (id: string, resolution: 'LOCAL_WINS' | 'CLOUD_WINS') => Promise<void>;
}

export const SyncTab: React.FC<SyncTabProps> = ({
  syncStatus,
  syncConflicts,
  syncLoading,
  triggerForceSync,
  handleResolveConflict,
}) => {
  if (!syncStatus) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Loading Sync Center...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Hybrid Cloud Sync Center</h2>
          <p className="text-xs text-slate-400">Offline-first sync logs queue status and remote dashboard sync health</p>
        </div>
        
        <button
          onClick={triggerForceSync}
          disabled={syncLoading}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-955 font-bold rounded-lg text-xs transition-all shadow-lg flex items-center gap-2"
        >
          {syncLoading ? 'Syncing...' : 'Force Sync Now'}
        </button>
      </div>

      {/* Status Indicator grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase block mb-1">Internet Health</span>
          <span className={`text-base font-bold flex items-center gap-1.5 ${syncStatus.internetConnected ? 'text-emerald-400' : 'text-rose-455'}`}>
            <span className={`w-2 h-2 rounded-full ${syncStatus.internetConnected ? 'bg-emerald-450' : 'bg-rose-455 animate-pulse'}`} />
            {syncStatus.internetConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase block mb-1">Pending Transactions</span>
          <span className="text-2xl font-bold text-slate-100">{syncStatus.pendingCount}</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase block mb-1">Failed Retries</span>
          <span className="text-2xl font-bold text-rose-455">{syncStatus.failedCount}</span>
        </div>
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase block mb-1">Active Conflicts</span>
          <span className="text-2xl font-bold text-amber-500">{syncStatus.conflictsCount}</span>
        </div>
      </div>

      {/* Conflicts Resolver Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-white text-sm">Active Overwrite Conflicts ({syncConflicts.length})</h3>
        {syncConflicts.length === 0 ? (
          <div className="p-6 border border-slate-900 border-dashed rounded-xl text-xs text-slate-500 text-center">
            All transaction logs synchronized smoothly with cloud server database. No conflicts logged.
          </div>
        ) : (
          <div className="space-y-3">
            {syncConflicts.map((c, i) => (
              <div key={i} className="bg-slate-900/25 border border-slate-900 p-4 rounded-xl text-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <div className="font-bold text-slate-200">Table: {c.entityName}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Entity ID: {c.entityId}</div>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  Local: {c.localPayload.substring(0, 70)}... <br />
                  Cloud: {c.cloudPayload.substring(0, 70)}...
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleResolveConflict(c.id, 'LOCAL_WINS')} className="px-3 py-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded font-bold">Local Wins</button>
                  <button onClick={() => handleResolveConflict(c.id, 'CLOUD_WINS')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded font-bold">Cloud Wins</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default SyncTab;
