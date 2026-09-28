import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, KeyRound, UserCheck, Lock, ScanBarcode, CheckCircle2, ArrowRight, ShieldCheck, Cpu, Terminal, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'module_a_engineer' | 'module_b_manager' | 'module_c_security', userDetails: { name: string; empId: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<'module_a_engineer' | 'module_b_manager' | 'module_c_security'>('module_a_engineer');
  const [email, setEmail] = useState('engineer@247.ai');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRoleChange = (role: 'module_a_engineer' | 'module_b_manager' | 'module_c_security') => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'module_a_engineer') {
      setEmail('engineer@247.ai');
      setPassword('••••••••');
    } else if (role === 'module_b_manager') {
      setEmail('dominic.manoharan@247.ai');
      setPassword('Dominic247!');
    } else {
      setEmail('platina.security@247.ai');
      setPassword('Welcome@247247');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let userEmail = email.trim();
    if (!userEmail.includes('@')) {
      userEmail = `${userEmail}@247.ai`;
    }

    if (!userEmail.toLowerCase().endsWith('@247.ai')) {
      setLoading(false);
      setErrorMsg('Unauthorized domain. Authentication requires an official office email (@247.ai).');
      return;
    }

    // Separate Approval Manager and Gate Security Password Rules
    const isManagerLogin = userEmail.toLowerCase().includes('manoharan') || 
                           userEmail.toLowerCase().includes('dominic') || 
                           selectedRole === 'module_b_manager';

    const isSecurityLogin = userEmail.toLowerCase().includes('platina') || 
                            userEmail.toLowerCase().includes('security') || 
                            selectedRole === 'module_c_security';

    if (isManagerLogin) {
      if (!password || password.trim().length === 0) {
        setLoading(false);
        setErrorMsg('Approval Manager login requires a valid NT passcode for dominic.manoharan@247.ai.');
        return;
      }
    }

    if (isSecurityLogin) {
      if (!password || password.trim().length === 0) {
        setLoading(false);
        setErrorMsg('Gate Security login requires default passcode Welcome@247247 for platina.security@247.ai.');
        return;
      }
    }

    setTimeout(() => {
      setLoading(false);

      let name = '';
      let empId = userEmail;

      if (isManagerLogin || selectedRole === 'module_b_manager') {
        name = 'Dominic Manoharan (IT Approval Manager)';
        empId = 'dominic.manoharan@247.ai';
      } else if (isSecurityLogin || selectedRole === 'module_c_security') {
        name = 'Platina Security Officer (Gate Security)';
        empId = 'platina.security@247.ai';
      } else {
        const handle = userEmail.split('@')[0];
        const nameParts = handle.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1));
        name = `${nameParts.join(' ')} (IT Engineer)`;
      }

      onLogin(selectedRole, { name, empId });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans" id="login-portal-view">
      
      {/* Header Branding */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold font-mono text-sm shadow-sm">
            24/7
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>[24]7.ai Asset Tracking</span>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Secure Portal
              </span>
            </h1>
            <p className="text-xs text-slate-500">CPU Movement & Security Clearance</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted Gateway Terminal</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <motion.main 
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl w-full mx-auto my-auto relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm"
      >
        
        {/* Left Portal Role Selection */}
        <div className="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Access Portal</span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Select Role & Authenticate
            </h2>

            {/* Portal Role Options */}
            <div className="space-y-2 pt-1">
              <motion.div 
                whileHover={{ scale: 1.01, x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleRoleChange('module_a_engineer')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                  selectedRole === 'module_a_engineer' 
                    ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">IT Field Engineer Desk</h4>
                  <p className="text-[11px] text-slate-500">Raise Movement Tickets & Floor Map</p>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.01, x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleRoleChange('module_b_manager')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                  selectedRole === 'module_b_manager' 
                    ? 'bg-amber-50 border-amber-500 text-slate-900 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Approval Manager Desk</h4>
                  <p className="text-[11px] text-slate-500">Manager Approvals & Master Audit</p>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.01, x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleRoleChange('module_c_security')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                  selectedRole === 'module_c_security' 
                    ? 'bg-indigo-50 border-indigo-500 text-slate-900 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                  C
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Gate Security Clearance</h4>
                  <p className="text-[11px] text-slate-500">Gate Barcode Scanner & Audit Logs</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right Credentials Form */}
        <div className="md:col-span-7 space-y-4 flex flex-col justify-center">
          
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>Sign In</span>
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Quick Presets */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Portal Role
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleChange('module_a_engineer')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === 'module_a_engineer'
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  IT Engineer
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleChange('module_b_manager')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === 'module_b_manager'
                      ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  IT Manager
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleChange('module_c_security')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === 'module_c_security'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gate Security
                </motion.button>
              </div>
            </div>

            {/* Official Office Mail ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Office Mail ID (@247.ai)
                </label>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@247.ai"
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Passcode / Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none transition-all"
              />
              <AnimatePresence>
                {(selectedRole === 'module_b_manager' || email.toLowerCase().includes('manoharan')) && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-900 font-mono flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Manager ID: <strong>dominic.manoharan@247.ai</strong></span>
                    </div>
                    <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5 rounded font-bold">
                      Passcode: Dominic247!
                    </span>
                  </motion.div>
                )}
                {(selectedRole === 'module_c_security' || email.toLowerCase().includes('platina') || email.toLowerCase().includes('security')) && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-2 text-xs text-indigo-900 font-mono flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Security ID: <strong>platina.security@247.ai</strong></span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 border border-indigo-300 text-indigo-800 px-2 py-0.5 rounded font-bold">
                      Passcode: Welcome@247247
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.p 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200"
                >
                  {errorMsg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Continue to Portal</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </motion.button>
          </form>

        </div>

      </motion.main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400 font-mono border-t border-slate-200 pt-4">
        [24]7.ai Asset Tracking Portal
      </footer>

    </div>
  );
}
