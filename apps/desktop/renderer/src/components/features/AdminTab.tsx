import React from 'react';

interface AdminTabProps {
  adminTab: 'users' | 'backups' | 'maintenance' | 'audit';
  setAdminTab: (val: 'users' | 'backups' | 'maintenance' | 'audit') => void;
  adminUsers: any[];
  userForm: any;
  setUserForm: (val: any) => void;
  setIsUserModalOpen: (val: boolean) => void;
  fetchAdminUsers: () => Promise<void>;
  API_BASE: string;
  triggerBackupDownload: () => Promise<void>;
  dbHealth: any;
  triggerOptimize: () => Promise<void>;
  maintenanceLoading: boolean;
  auditLogs: any[];
  auditTotal: number;
  auditPage: number;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  auditSearch: string;
  setAuditSearch: (val: string) => void;
  auditModuleFilter: string;
  setAuditModuleFilter: (val: string) => void;
  triggerBackupRestore: (file: File) => Promise<void>;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  adminTab,
  setAdminTab,
  adminUsers,
  userForm,
  setUserForm,
  setIsUserModalOpen,
  fetchAdminUsers,
  API_BASE,
  triggerBackupDownload,
  dbHealth,
  triggerOptimize,
  maintenanceLoading,
  auditLogs,
  auditTotal,
  auditPage,
  setAuditPage,
  auditSearch,
  setAuditSearch,
  auditModuleFilter,
  setAuditModuleFilter,
  triggerBackupRestore,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs text-muted">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 text-base">System Administration</h2>
          <p className="text-xs text-muted">Account profiles, Postgres optimizations, data backup files, and action audits</p>
        </div>
        
        {/* Admin sub-tabs */}
        <div className="flex gap-2 bg-white/40 p-1.5 border border-border rounded-lg">
          <button onClick={() => setAdminTab('users')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${adminTab === 'users' ? 'bg-primary text-slate-955 font-bold' : 'text-muted'}`}>User Accounts</button>
          <button onClick={() => setAdminTab('backups')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${adminTab === 'backups' ? 'bg-primary text-slate-955 font-bold' : 'text-muted'}`}>Database Backups</button>
          <button onClick={() => setAdminTab('maintenance')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${adminTab === 'maintenance' ? 'bg-primary text-slate-955 font-bold' : 'text-muted'}`}>DB Maintenance</button>
          <button onClick={() => setAdminTab('audit')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${adminTab === 'audit' ? 'bg-primary text-slate-955 font-bold' : 'text-muted'}`}>Audit Trails</button>
        </div>
      </div>

      {/* ADMIN: USER ACCOUNTS */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Active system users list</span>
            <button onClick={() => { setUserForm({ username: '', passwordHash: '', role: 'CASHIER', status: true }); setIsUserModalOpen(true); }} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-slate-955 text-xs font-bold rounded">Add Account</button>
          </div>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-gray-600">
              <thead className="bg-white/60 uppercase text-[10px] text-muted border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Username</th>
                  <th className="py-2.5 px-4">Role Profile</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u, i) => (
                  <tr key={i} className="border-b border-gray-200/40">
                    <td className="py-2.5 px-4 font-bold text-gray-700">{u.username}</td>
                    <td className="py-2.5 px-4">{u.role}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        u.status ? 'bg-emerald-500/10 text-emerald-450' : 'bg-gray-100 text-gray-500'
                      }`}>{u.status ? 'ACTIVE' : 'DISABLED'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button onClick={() => { setUserForm(u); setIsUserModalOpen(true); }} className="text-primary hover:underline">Edit</button>
                      <button onClick={async () => {
                        const newPass = prompt("Enter new password for: " + u.username);
                        if (newPass) {
                          await fetch(`${API_BASE}/users-management/${u.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ passwordHash: newPass })
                          });
                          // Cache password locally for login verification
                          try {
                            let cached = JSON.parse(localStorage.getItem('medingen_user_passwords') || '{}');
                            cached[u.username] = newPass;
                            localStorage.setItem('medingen_user_passwords', JSON.stringify(cached));
                          } catch (err) {}
                          alert("Password updated!");
                          fetchAdminUsers();
                        }
                      }} className="text-muted hover:underline">Reset Pass</button>
                      <button onClick={async () => {
                        const confirmDelete = confirm("Are you sure you want to delete user: " + u.username + "?");
                        if (confirmDelete) {
                          try {
                            const res = await fetch(`${API_BASE}/users-management/${u.id}`, {
                              method: 'DELETE',
                            });
                            if (res.ok) {
                              alert("User deleted successfully!");
                              fetchAdminUsers();
                            } else {
                              const err = await res.json().catch(() => ({}));
                              alert("Failed to delete user: " + (err.message || "Unknown error"));
                            }
                          } catch(err: any) {
                            alert("Error: " + err.message);
                          }
                        }
                      }} className="text-rose-600 hover:underline">Delete</button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN: DATABASE BACKUPS */}
      {adminTab === 'backups' && (
        <div className="space-y-4 max-w-md">
          <div className="bg-white/20 p-5 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b border-gray-200 pb-2">Manual Data Backup</h3>
            <p className="text-muted leading-relaxed">Save a complete JSON snapshot file containing product lists, categories, suppliers catalog, batches, settings, and invoice ledger tables to your disk.</p>
            <button onClick={triggerBackupDownload} className="w-full py-2 bg-primary hover:bg-primary-hover text-slate-955 font-bold rounded">Download Backup JSON File</button>
          </div>

          <div className="bg-white/20 p-5 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-b border-gray-200 pb-2">Restore Backup File</h3>
            <p className="text-rose-600 leading-relaxed">WARNING: Restoring a backup overwrites all local products, categories, suppliers, and active batches stock levels. Make sure to back up active ledgers first.</p>
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await triggerBackupRestore(file);
                }
              }}
              className="w-full text-gray-700 bg-white border border-gray-200 p-2 rounded"
            />
          </div>
        </div>
      )}

      {/* ADMIN: DB MAINTENANCE */}
      {adminTab === 'maintenance' && dbHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health check card */}
          <div className="bg-white/25 border border-gray-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-gray-800 text-sm uppercase">Postgres Connection Health</h3>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span>Server Status:</span>
              <span className="text-emerald-400 font-bold">{dbHealth.status}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span>Categories Count:</span>
              <span className="font-mono">{dbHealth.metrics.categoriesCount}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span>Products Count:</span>
              <span className="font-mono">{dbHealth.metrics.productsCount}</span>
            </div>
            <div className="flex justify-between font-bold border-b border-border pb-2">
              <span>Invoices Count:</span>
              <span className="font-mono">{dbHealth.metrics.billsCount}</span>
            </div>
          </div>

          {/* Optimizations card */}
          <div className="bg-white/25 border border-gray-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-gray-800 text-sm uppercase">Table Optimizations</h3>
            <p className="text-muted leading-relaxed">Reindexing rebuilt databases resolves query slowdowns when table records grow. Executes standard PostgreSQL table reindexes.</p>
            <button
              onClick={triggerOptimize}
              disabled={maintenanceLoading}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-slate-955 font-bold rounded disabled:opacity-40"
            >
              {maintenanceLoading ? 'Running index optimize...' : 'Reindex Tables'}
            </button>
          </div>
        </div>
      )}

      {/* ADMIN: AUDIT TRAILS */}
      {adminTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/20 border border-gray-200 p-4 rounded-xl">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                placeholder="Search logs by operator or details..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={auditModuleFilter}
                onChange={(e) => { setAuditModuleFilter(e.target.value); setAuditPage(1); }}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-250 focus:outline-none"
              >
                <option value="">All Modules</option>
                <option value="PRODUCTS">Products</option>
                <option value="PURCHASES">Purchases</option>
                <option value="BILLING">Billing Desk</option>
                <option value="USERS">Users</option>
                <option value="DB">DB maintenance</option>
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white/10">
            <table className="w-full text-left text-gray-600">
              <thead className="bg-white/60 uppercase text-[10px] text-muted border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-white/10 border-b border-gray-200/40">
                    <td className="py-2.5 px-4 text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-gray-700 font-semibold">{log.username || 'System'}</td>
                    <td className="py-2.5 px-4 font-mono text-[10px]">{log.module}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-primary text-[10px]">{log.action}</td>
                    <td className="py-2.5 px-4 text-gray-700 max-w-[250px] truncate">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/20 border-t border-gray-200 text-xs">
            <span className="text-muted">Total {auditTotal} audit logs</span>
            <div className="flex gap-2">
              <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 font-mono">Page {auditPage}</span>
              <button onClick={() => setAuditPage(p => p + 1)} disabled={auditPage >= Math.ceil(auditTotal / 15)} className="px-3 py-1 bg-white border border-gray-200 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminTab;
