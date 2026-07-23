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
  currentUser?: any;
  handleResetDatabase?: (target: string) => Promise<void>;
}

type SettingSection = 'preferences' | 'general' | 'billing' | 'printer' | 'gst' | 'pricing' | 'sync' | 'backup' | 'license' | 'about' | 'maintenance';

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
  currentUser,
  handleResetDatabase,
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
    ...(currentUser?.role === 'ADMIN' ? [{ id: 'maintenance', label: 'Maintenance & Reset', icon: '🛠️' }] : []),
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

            {/* General Store Config */}
            {activeSection === 'general' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🏪 General Store Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Pharmacy / Store Name *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.storeName || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                      placeholder="e.g. Medingen Pharmacy"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Store Phone Contact *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.phone || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-muted font-semibold">Registered Store Email</label>
                    <input
                      type="email"
                      value={settingsForm.email || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      placeholder="e.g. info@medingen.com"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-muted font-semibold">Physical Location / Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={settingsForm.address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="Enter full store address"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Billing & Prefixes */}
            {activeSection === 'billing' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🧾 Billing Code Prefixes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Invoice Number Prefix *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.invoicePrefix || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })}
                      placeholder="e.g. INV-"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Purchase Order Prefix *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.poPrefix || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, poPrefix: e.target.value })}
                      placeholder="e.g. PO-"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Thermal Printer Setup */}
            {activeSection === 'printer' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🖨️ Thermal Printer Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Active Receipt Printer Type</label>
                    <select
                      value={settingsForm.printerType || '80mm'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, printerType: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-semibold"
                    >
                      <option value="58mm">58mm (2-inch Receipt)</option>
                      <option value="80mm">80mm (3-inch Standard Receipt)</option>
                      <option value="150x95mm">150x95mm (A4 Half-Slip Grid)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* GST Tax parameters */}
            {activeSection === 'gst' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">📊 GSTIN Tax Identification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-muted font-semibold">Store GST Registration Number (GSTIN)</label>
                    <input
                      type="text"
                      value={settingsForm.gstin || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value })}
                      placeholder="e.g. 33AAAAA1111A1Z1"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Defaults */}
            {activeSection === 'pricing' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">💰 Retail Pricing Defaults</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Default Margin Markup (%)</label>
                    <input
                      type="number"
                      value={settingsForm.defaultMargin || 15}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultMargin: parseFloat(e.target.value) })}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cloud Sync Engine */}
            {activeSection === 'sync' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">☁️ Cloud Synchronization Engine</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-muted font-semibold">Remote Cloud Gateway Endpoint</label>
                    <input
                      type="text"
                      value={settingsForm.cloudUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cloudUrl: e.target.value })}
                      placeholder="e.g. https://cloud.medingen.com/api"
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Auto Backups */}
            {activeSection === 'backup' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">💾 Database Backups Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-muted font-semibold">Automatic Backup Cycle</label>
                    <select
                      value={settingsForm.backupInterval || 'DAILY'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, backupInterval: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-850 focus:outline-none font-semibold"
                    >
                      <option value="HOURLY">Hourly Snapshots</option>
                      <option value="DAILY">Daily Snapshots</option>
                      <option value="WEEKLY">Weekly Archive</option>
                      <option value="NEVER">Disable Auto Backups</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* License Activation */}
            {activeSection === 'license' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">🔑 Desk ERP License Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/40 p-4 border border-gray-200 rounded-xl leading-relaxed">
                  <div className="space-y-1 text-gray-500 font-semibold">
                    <div>Product Name: <span className="text-gray-700">Medingen Desk ERP Pro</span></div>
                    <div>License Status: <span className={licenseInfo?.active ? "text-teal-600 font-bold" : "text-rose-600 font-bold"}>{licenseInfo?.active ? "ACTIVATED" : "NOT ACTIVATED"}</span></div>
                    <div>Expires On: <span className="text-gray-700">{licenseInfo?.expiryDate ? new Date(licenseInfo.expiryDate).toLocaleDateString() : 'N/A'}</span></div>
                    <div>Client UUID: <span className="text-gray-500 font-mono text-[10px]">{licenseInfo?.clientUuid || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* About Desk ERP */}
            {activeSection === 'about' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">ℹ️ About Medingen Desk ERP</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/40 p-4 border border-gray-200 rounded-xl space-y-2 leading-relaxed">
                    <span className="font-bold text-gray-700 block text-xs">System Details</span>
                    <div className="space-y-1 text-gray-500 font-semibold">
                      <div>Software Version: <span className="text-gray-750">v1.2.4-stable</span></div>
                      <div>Engine Runtime: <span className="text-gray-750">Electron / Next.js SPA</span></div>
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

            {/* Database Maintenance & Reset */}
            {activeSection === 'maintenance' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2 text-rose-600">🛠️ Database Maintenance & Reset</h3>
                <p className="text-gray-500 font-semibold text-[11px] leading-relaxed">
                  Select a section below to reset local database tables. Each reset is isolated to that specific module.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Wipe Sales */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">🧾 Clear Invoices & Sales</span>
                      <p className="text-gray-450 text-[10px] mt-1">Deletes all customer bills, payment details, and records. Users, inventory, and suppliers remain untouched.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all invoice bills and payments? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('sales');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Sales
                    </button>
                  </div>

                  {/* Wipe Purchases */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">📦 Clear Purchase Orders (PO)</span>
                      <p className="text-gray-455 text-[10px] mt-1">Wipes all PO records and purchase returns. Products and sales remain untouched.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all Purchase Orders? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('purchases');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Purchases
                    </button>
                  </div>

                  {/* Wipe Products */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">💊 Clear Products & Inventory</span>
                      <p className="text-gray-450 text-[10px] mt-1">Clears all medicine items, active batches, inventory quantities, stock adjustments, and categories.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete all products and inventory data? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('products');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Catalog
                    </button>
                  </div>

                  {/* Wipe Contacts */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">👥 Clear Customers & Doctors</span>
                      <p className="text-gray-450 text-[10px] mt-1">Deletes all registered profiles from customer and doctor registries. Bills and stocks remain.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete all registered customers and doctors? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('contacts');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Contacts
                    </button>
                  </div>

                  {/* Wipe Drug Schedule Register */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">📒 Clear Drug Register</span>
                      <p className="text-gray-450 text-[10px] mt-1">Deletes all patient drug logs and prescriptions in the /drugRegister module.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all drug registers? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('drugRegister');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Drug Register
                    </button>
                  </div>

                  {/* Wipe Hold Bills */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div>
                      <span className="font-bold text-gray-800 block text-xs">⏳ Clear Hold Bills</span>
                      <p className="text-gray-450 text-[10px] mt-1">Wipes all sales records currently kept on hold in the billing panel.</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all hold bills? This action is irreversible.")) {
                          if (handleResetDatabase) await handleResetDatabase('holdBills');
                        }
                      }}
                      className="w-fit px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-600 hover:text-white rounded font-bold transition-all text-[10px] cursor-pointer"
                    >
                      Clear Hold Bills
                    </button>
                  </div>
                </div>

                {/* Master Reset Section */}
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3 mt-6 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <h4 className="font-bold text-rose-700 text-xs uppercase tracking-wide">Danger Zone: Complete System Reset</h4>
                      <p className="text-rose-600 text-[10.5px] mt-0.5 font-semibold">
                        Clears absolutely everything (invoices, POs, inventory, registers, accounts) and returns to factory default state.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("CRITICAL WARNING:\n\nAre you absolutely sure you want to perform a Complete System Reset?\n\nThis will permanently delete ALL pharmacy records, bills, stock, settings, and users.\n\nType 'OK' if you want to proceed.")) {
                        if (handleResetDatabase) await handleResetDatabase('all');
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all shadow cursor-pointer text-xs"
                  >
                    Trigger Master Reset Now
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Action bar (Hide if on About/License/Maintenance section which are read-only or handled separately) */}
          {activeSection !== 'about' && activeSection !== 'license' && activeSection !== 'maintenance' && (
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
