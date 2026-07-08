import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { FiLogIn } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; username: string; role: string }) => void;
  localDbConnected: boolean;
  syncStatus: any;
  allUsers: any[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  localDbConnected,
  syncStatus,
  allUsers,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load remembered user
  useEffect(() => {
    const remembered = localStorage.getItem('medingen_remembered_username');
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      // Small simulated delay for premium micro-animations (optional, let's keep it under 300ms for responsiveness)
      await new Promise(resolve => setTimeout(resolve, 300));

      const res = await fetch(`${API_BASE}/users-management/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Authentication failed. Check credentials and try again.');
      }

      const responseBody = await res.json();
      const user = responseBody.data;

      if (rememberMe) {
        localStorage.setItem('medingen_remembered_username', username.trim());
      } else {
        localStorage.removeItem('medingen_remembered_username');
      }

      // Cache session
      const session = {
        id: user.id,
        username: user.username,
        role: user.role,
        token: user.token, // Store the cryptographically signed JWT token
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('medingen_session', JSON.stringify(session));
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Connection error. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = () => {
    alert('Password recovery is disabled for offline local database configurations. Please contact your system administrator to reset password via the Admin Tab.');
  };

  return (
    <div className="min-h-screen bg-slate-955 flex items-center justify-center p-4 select-none font-sans text-xs">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.03)_0%,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fadeIn">
        
        {/* Top brand header */}
        <div className="p-8 text-center border-b border-slate-850 bg-slate-950/20">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
            <svg className="w-7 h-7 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-12h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Medingen Pharmacy
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">ERP & Billing System</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-lg text-xs leading-normal font-semibold animate-fadeIn">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] text-teal-400 hover:text-teal-300 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-slate-400 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember me on this station</span>
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-bold mt-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Enter ERP Workspace</span>
                <FiLogIn size={16} />
              </div>
            )}
          </Button>
        </form>

        {/* Footer info panel */}
        <div className="px-8 py-4 border-t border-slate-850 bg-slate-950/20 text-slate-500 font-mono text-[9px] flex justify-between items-center">
          <div>VERSION 1.0.4 PROD</div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${localDbConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-rose-500'}`} />
              DATABASE
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus?.activeWorkers ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-700'}`} />
              CLOUD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginScreen;
