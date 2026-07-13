import React, { useState } from 'react';
import { Button } from '../common/Button';

interface SettingsTabProps {
  settingsForm: any;
  setSettingsForm: (val: any) => void;
  settingsLoading: boolean;
  handleSaveSettings: (e: React.FormEvent) => Promise<void>;
  licenseInfo: any;
  activationKey: string;
  setActivationKey: (val: string) => void;
  handleActivateLicense: (e: React.FormEvent) => Promise<void>;
  
  density: 'comfortable' | 'compact';
  setDensity: (val: 'comfortable' | 'compact') => void;
}

type SettingSection = 'preferences' | 'general' | 'billing' | 'printer' | 'gst' | 'pricing' | 'sync' | 'backup' | 'license' | 'about';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settingsForm,
  setSettingsForm,
  settingsLoading,
  handleSaveSettings,
  licenseInfo,
  activationKey,
  setActivationKey,
  handleActivateLicense,
  
  density,
  setDensity,
}) => {
  const [activeSection, setActiveSection] = useState<SettingSection>('preferences');

  const menuItems = [
    { id: 'preferences', label: 'User Preferences', icon: '⚙️' },
    { id: 'general', label: 'General Store Config', icon: '🏪' },
    { id: 'billing', label: 'Billing & Prefixes', icon: '🧾' },
    { id: 'printer', label: 'Thermal Printer Setup', icon: '🖨️' },
    { id: 'gst', label: 'GST Tax parameters', icon: '📊' },
    { id: 'pricing', label: 'Pricing Defaults', icon: '💰' },
    { id: 'sync', label: 'Cloud Sync Engine', icon: '☁️' },
    { id: 'backup', label: 'Auto Backups', icon: '💾' },
    { id: 'license', label: 'License Activation', icon: '🔑' },
    { id: 'about', label: 'About Desk ERP', icon: 'ℹ️' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn font-sans text-xs text-muted">
      
      {/* Settings Side Menu */}
      <div className="md:col-span-3 bg-white/35 border border-gray-200 p-3 rounded-2xl h-fit space-y-1 font-semibold">
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block px-3.5 py-2 border-b border-gray-200 mb-2">Settings Menu</span>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id as SettingSection)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === item.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted hover:bg-gray-50/50 hover:text-gray-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Panel Body */}
      <div className="md:col-span-9 bg-white/20 border border-gray-200 p-6 rounded-2xl min-h-[400px] flex flex-col justify-between shadow-xl">
        <form onSubmit={handleSaveSettings} className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* User Preferences */}
            {activeSection === 'preferences' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">⚙️ User Display Preferences</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">UI Display Density</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDensity('comfortable');
                          localStorage.setItem('medingen-density', 'comfortable');
                        }}
                        className={`py-2 px-3 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          density === 'comfortable'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-muted border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Comfortable (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDensity('compact');
                          localStorage.setItem('medingen-density', 'compact');
                        }}
                        className={`py-2 px-3 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          density === 'compact'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-muted border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Compact (Dense Lists)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. General Config */}
            {activeSection === 'general' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🏪 General Store Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Store / Pharmacy Name *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.storeName || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Phone Contact</label>
                    <input
                      type="text"
                      value={settingsForm.phone || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Support Email</label>
                    <input
                      type="email"
                      value={settingsForm.email || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Physical Location Address</label>
                    <input
                      type="text"
                      value={settingsForm.address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Billing Prefix settings */}
            {activeSection === 'billing' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🧾 Billing & Invoice Config</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Invoice Number Prefix</label>
                    <input
                      type="text"
                      value={settingsForm.invoicePrefix || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Purchase Order Prefix</label>
                    <input
                      type="text"
                      value={settingsForm.poPrefix || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, poPrefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Printer width Setup */}
            {activeSection === 'printer' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🖨️ Thermal Printer Specifications</h3>
                <div className="max-w-md space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Thermal Paper Roll Width</label>
                    <select
                      value={settingsForm.printerType || '80mm'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, printerType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700"
                    >
                      <option value="80mm">80mm Standard paper width (Desktop standard)</option>
                      <option value="58mm">58mm Compact paper width (Handheld standard)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">Thermal emulation dynamically prints formatted plaintext receipt files wrapping invoices with proper character widths matching these boundaries.</p>
                </div>
              </div>
            )}

            {/* 4. GST Setup */}
            {activeSection === 'gst' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">📊 GST Tax Parameters</h3>
                <div className="max-w-md space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Pharmacy GSTIN identification</label>
                    <input
                      type="text"
                      value={settingsForm.gstin || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value })}
                      placeholder="e.g. 29AAAAA1111A1Z1"
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">The registered GSTIN is embedded on thermal printed headers and sales return tax receipts. All transactions are logged with CGST (50%) and SGST (50%) components automatically.</p>
                </div>
              </div>
            )}

            {/* Pricing Defaults */}
            {activeSection === 'pricing' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">💰 Global Pricing Defaults</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Default Offline Store Markup (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={settingsForm.defaultOfflineMarkup ?? 50.0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultOfflineMarkup: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-105 text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Default Online Store Markup (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={settingsForm.defaultOnlineMarkup ?? 85.0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultOnlineMarkup: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-105 text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Default GST tax (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={settingsForm.defaultGst ?? 12.0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultGst: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-105 text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Default Retail Discount (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={settingsForm.defaultRetailDiscount ?? 0.0}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultRetailDiscount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-105 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal">
                  These markups and tax policies serve as the initialization template when creating new products or when resetting pricing books. Individual products can override these rules locally.
                </p>
              </div>
            )}

            {/* 5. Cloud Sync */}
            {activeSection === 'sync' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">☁️ Hybrid Cloud Synchronization</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl">
                    <div>
                      <span className="font-bold text-gray-700 block">Cloud Status: Active Sync</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Automatically syncs invoices & products in the background</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">Medingen operates on a hybrid architecture. If internet disconnects, billing handles locally offline, and queues sync jobs automatically when connection restores.</p>
                </div>
              </div>
            )}

            {/* 6. Database Auto backups */}
            {activeSection === 'backup' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">💾 Database Backups Schedule</h3>
                <div className="max-w-md space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Auto-Backup Frequency</label>
                    <select
                      value={settingsForm.backupInterval || 'DAILY'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, backupInterval: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700"
                    >
                      <option value="DAILY">Once every 24 Hours (Recommended)</option>
                      <option value="WEEKLY">Once every 7 Days</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">Database backups are automatically stored to local snapshots folder under the workspace directory, or downloadable as complete JSON files in the Admin Tab.</p>
                </div>
              </div>
            )}

            {/* 7. License activation form */}
            {activeSection === 'license' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🔑 License Status & Offline Activation</h3>
                
                {licenseInfo ? (
                  <div className="space-y-4">
                    <div className="bg-white p-4 border border-gray-200 rounded-xl space-y-3.5 font-mono text-[10px] text-muted">
                      <div className="flex justify-between border-b border-gray-200 pb-1.5">
                        <span>Active Key:</span>
                        <span className="font-bold text-gray-800">{licenseInfo.licenseKey}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-1.5">
                        <span>License Status:</span>
                        <span className={`font-bold ${licenseInfo.status === 'ACTIVE' ? 'text-emerald-450' : 'text-rose-600'}`}>{licenseInfo.status}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-1.5">
                        <span>Activated On:</span>
                        <span>{licenseInfo.activatedAt ? new Date(licenseInfo.activatedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expires On:</span>
                        <span>{licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 py-4 text-center">No license details found in database registry.</div>
                )}
              </div>
            )}

            {/* 8. About Section */}
            {activeSection === 'about' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">ℹ️ About Medingen Pharmacy ERP</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/40 p-4 border border-gray-200 rounded-xl space-y-2 leading-relaxed">
                    <span className="font-bold text-gray-700 block text-xs">Environment Specs</span>
                    <div className="space-y-1 font-mono text-[10px] text-gray-500">
                      <div>Application: <span className="text-gray-700">Medingen Pharmacy ERP</span></div>
                      <div>App Version: <span className="text-gray-700">1.0.4 PROD</span></div>
                      <div>Next.js Server: <span className="text-gray-700">v16.2.9</span></div>
                      <div>React Renderer: <span className="text-gray-700">v19.2.4</span></div>
                      <div>Tailwind Style: <span className="text-gray-700">v4.0.0</span></div>
                    </div>
                  </div>

                  <div className="bg-white/40 p-4 border border-gray-200 rounded-xl space-y-2 leading-relaxed">
                    <span className="font-bold text-gray-700 block text-xs">Customer Support Contact</span>
                    <div className="space-y-1 text-gray-500 font-semibold">
                      <div>Company: <span className="text-gray-600">Medingen Solutions Group</span></div>
                      <div>Support Hotline: <span className="text-primary">+91 99887 76655</span></div>
                      <div>Support Email: <span className="text-primary">helpdesk@medingen.com</span></div>
                      <div>Address: <span className="text-gray-600 text-[10px]">Indiranagar Block 4, Bangalore 560038</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action bar (Hide if on About/License section which are read-only or handled separately) */}
          {activeSection !== 'about' && activeSection !== 'license' && (
            <div className="flex justify-end pt-5 border-t border-gray-200">
              <Button 
                type="submit" 
                disabled={settingsLoading} 
                className="px-6 py-2 cursor-pointer font-bold"
              >
                {settingsLoading ? 'Saving config...' : 'Save Settings Details'}
              </Button>
            </div>
          )}
        </form>

        {/* Alternate Activation Form directly on License Section */}
        {activeSection === 'license' && (
          <form onSubmit={handleActivateLicense} className="flex gap-3 pt-5 border-t border-gray-200 mt-4 animate-fadeIn">
            <input
              type="text"
              required
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              placeholder="Enter offline activation license key (MED-XXXX-...)"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 font-mono text-xs focus:outline-none"
            />
            <Button type="submit" className="px-5 py-2 font-bold cursor-pointer">Activate</Button>
          </form>
        )}

      </div>

    </div>
  );
};
export default SettingsTab;
