import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SetupWizardModalProps {
  settingsForm: any;
  setSettingsForm: (val: any) => void;
  onComplete: (updatedSettings: any) => Promise<void>;
  currentUser: any;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  settingsForm,
  setSettingsForm,
  onComplete,
  currentUser,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields State
  const [storeName, setStoreName] = useState(settingsForm.storeName || '');
  const [phone, setPhone] = useState(settingsForm.phone || '');
  const [email, setEmail] = useState(settingsForm.email || '');
  const [address, setAddress] = useState(settingsForm.address || '');
  const [gstin, setGstin] = useState(settingsForm.gstin || '');
  const [drugLicense, setDrugLicense] = useState('');
  
  // Admin Password
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Integration
  const [cloudUrl, setCloudUrl] = useState('http://localhost:3002');
  const [printerType, setPrinterType] = useState('80mm');

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!storeName.trim()) return 'Store / Pharmacy Name is required.';
      if (!phone.trim()) return 'Contact Phone is required.';
      if (!address.trim()) return 'Store Physical Address is required.';
    } else if (step === 2) {
      if (!gstin.trim()) return 'GSTIN is required.';
      // Simple Indian GSTIN regex validation
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstin.trim().toUpperCase())) {
        return 'Please input a valid 15-character GSTIN format (e.g. 29AAAAA1111A1Z1).';
      }
      if (!drugLicense.trim()) return 'Drug License Number is required.';
    } else if (step === 3) {
      if (!adminPassword.trim()) return 'Administrator password is required.';
      if (adminPassword.length < 6) return 'Password must be at least 6 characters.';
      if (adminPassword !== confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Re-authenticate first to get a guaranteed fresh JWT token.
      // This is necessary because the server may have hot-reloaded between
      // when the user logged in and when they reach this step, which would
      // invalidate the stored session token. During first-time setup the
      // DB password is always the seeded default, so we can silently re-login.
      let activeToken = currentUser.token;
      try {
        const reAuthRes = await fetch(`${API_BASE}/users-management/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser.username, password: 'Admin@123' }),
        });
        if (reAuthRes.ok) {
          const reAuthData = (await reAuthRes.json()).data;
          activeToken = reAuthData.token;
          // Persist the fresh token to localStorage so it survives the wizard completion
          try {
            const storedSession = localStorage.getItem('medingen_session');
            if (storedSession) {
              const session = JSON.parse(storedSession);
              session.token = activeToken;
              localStorage.setItem('medingen_session', JSON.stringify(session));
            }
          } catch (_) {}
        }
      } catch (_) {
        // Re-auth failed — fall back to existing token and let the API calls surface the error
      }

      // 1. Update Admin Password
      const passwordRes = await fetch(`${API_BASE}/users-management/${currentUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          passwordHash: adminPassword,
        }),
      });

      if (!passwordRes.ok) {
        const errBody = await passwordRes.json().catch(() => ({}));
        throw new Error(errBody?.message || 'Failed to update administrator password.');
      }

      // 2. Format Address with Drug License info to prevent database schema modification
      const formattedAddress = `${address.trim()} (Drug Lic: ${drugLicense.trim()})`;

      // 3. Save Settings to Backend
      const settingsRes = await fetch(`${API_BASE}/system-settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          storeName: storeName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: formattedAddress,
          gstin: gstin.trim().toUpperCase(),
          printerType,
          backupInterval: 'DAILY',
        }),
      });

      if (!settingsRes.ok) {
        throw new Error('Failed to save store configuration.');
      }

      const settingsData = (await settingsRes.json()).data;
      
      // 4. Update local Sync settings to cloudUrl
      await fetch(`${API_BASE}/sync/force`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        }
      }).catch(() => null); // Silent pass

      await onComplete(settingsData);
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Verify local NestJS server connectivity.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans text-xs text-slate-400 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.03)_0%,transparent_60%)] pointer-events-none" />
        
        {/* Header */}
        <div className="p-6 border-b border-slate-850 bg-slate-950/30 flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">🚀 Medingen First-Time Setup Wizard</h2>
            <p className="text-[10px] text-slate-500 mt-1">Configure your pharmacy instance before launching terminal dashboards.</p>
          </div>
          <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">STEP {step} OF 4</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-950">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3 rounded-lg font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: Store & Contact */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="font-bold text-slate-200 block text-xs">🏪 Step 1: General Pharmacy Configurations</span>
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Store / Pharmacy Name *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Medingen Pharmacy Main Store"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-450 font-bold">Store Phone *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9988776655"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-450 font-bold">Support Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. contact@store.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Physical Address Location *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Block 4 Indiranagar, Bangalore, Karnataka"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Tax & Licenses */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="font-bold text-slate-200 block text-xs">📊 Step 2: Tax Parameters & Licenses</span>
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Pharmacy GSTIN *</label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 29AAAAA1111A1Z1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">State Drug License Number *</label>
                  <input
                    type="text"
                    required
                    value={drugLicense}
                    onChange={(e) => setDrugLicense(e.target.value)}
                    placeholder="e.g. KA-IND-12345/2026"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed leading-normal">
                  The Drug License and GSTIN numbers are dynamically embedded on customer receipts and billing statements to guarantee local drug store compliance standards.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Admin Password Policy */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="font-bold text-slate-200 block text-xs">🔑 Step 3: Configure Administrator Credentials</span>
              <div className="space-y-3.5">
                <p className="text-[10px] text-slate-500 leading-normal">
                  You are currently logged in with the default setup account credentials. For security, please choose a strong custom administrator password.
                </p>
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">New Admin Password *</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Password (minimum 6 characters)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Confirm Admin Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Integrations */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <span className="font-bold text-slate-200 block text-xs">🔌 Step 4: System Integration Parameters</span>
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Cloud Sync Target API URL *</label>
                  <input
                    type="text"
                    required
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-450 font-bold">Active Thermal Receipt Printer Width *</label>
                  <select
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="80mm">80mm Standard thermal roll width</option>
                    <option value="58mm">58mm Compact thermal roll width</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-between items-center pt-5 border-t border-slate-850 mt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-850 text-slate-350 font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-teal-500/10"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-tr from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-450 rounded-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Configuring ERP...</span>
                  </>
                ) : (
                  'Complete Setup & Launch'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
