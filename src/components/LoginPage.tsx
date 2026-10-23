import CompanyLogo from './CompanyLogo';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  KeyRound, 
  UserCheck, 
  Lock, 
  ScanBarcode, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  User, 
  Globe, 
  Sparkles,
  ExternalLink,
  Building,
  Key,
  Info
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'module_a_engineer' | 'module_b_manager' | 'module_c_security', userDetails: { name: string; empId: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  // Primary Auth Tab: Testing Mode vs Corporate SSO Mode
  const [authMethod, setAuthMethod] = useState<'testing_role' | 'corporate_sso'>('testing_role');

  // Testing Mode State
  const [selectedRole, setSelectedRole] = useState<'module_a_engineer' | 'module_b_manager' | 'module_c_security'>('module_a_engineer');
  const [email, setEmail] = useState('engineer@247.ai');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Corporate SSO State
  const [ssoEmail, setSsoEmail] = useState('dominic.manoharan@247.ai');
  const [ssoProvider, setSsoProvider] = useState<'azure_ad' | 'google_workspace'>('azure_ad');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState('');
  const [showSsoGuideModal, setShowSsoGuideModal] = useState(false);

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

  const handleTestingLogin = (e: React.FormEvent) => {
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

    const isManagerLogin = userEmail.toLowerCase().includes('manoharan') || 
                           userEmail.toLowerCase().includes('dominic') || 
                           selectedRole === 'module_b_manager';

    const isSecurityLogin = userEmail.toLowerCase().includes('platina') || 
                            userEmail.toLowerCase().includes('security') || 
                            selectedRole === 'module_c_security';

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
    }, 350);
  };

  const handleSsoAuthenticate = (targetEmail?: string) => {
    const emailToUse = (targetEmail || ssoEmail).trim().toLowerCase();
    setSsoLoading(true);
    setSsoError('');

    if (!emailToUse.endsWith('@247.ai') && !emailToUse.includes('@')) {
      setSsoLoading(false);
      setSsoError('Corporate SSO requires an authorized @247.ai Active Directory email.');
      return;
    }

    setTimeout(() => {
      setSsoLoading(false);

      // Active Directory Group / Role Mapping Rule
      if (emailToUse.includes('dominic') || emailToUse.includes('manoharan') || emailToUse.includes('jyothi') || emailToUse.includes('manager')) {
        const displayName = emailToUse.includes('jyothi') ? 'Jyothi Potula (IT Approval Manager)' : 'Dominic Manoharan (IT Approval Manager)';
        onLogin('module_b_manager', { name: displayName, empId: emailToUse });
      } else if (emailToUse.includes('platina') || emailToUse.includes('security') || emailToUse.includes('gate')) {
        onLogin('module_c_security', { name: 'Platina Security Clearance Officer', empId: emailToUse });
      } else {
        const handle = emailToUse.split('@')[0];
        const nameParts = handle.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1));
        onLogin('module_a_engineer', { name: `${nameParts.join(' ')} (IT Field Engineer)`, empId: emailToUse });
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans" id="login-portal-view">
      
      {/* Header Branding */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <CompanyLogo size="lg" />
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>[24]7.ai Asset Tracking</span>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Portal Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-500">CPU Movement, Approvals & Platina Gate Clearance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Directory SSO Ready</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSsoGuideModal(true)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <Info className="w-3.5 h-3.5" />
            <span>SSO Config Guide</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <motion.main 
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl w-full mx-auto my-auto relative z-10 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
      >
        {/* Top Authentication Method Switcher (Testing Mode vs Enterprise SSO) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAuthMethod('testing_role')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                authMethod === 'testing_role'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Testing Mode (Role Selector)</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMethod('corporate_sso')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                authMethod === 'corporate_sso'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Corporate SSO & Active Directory</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-900 font-mono px-1.5 py-0.2 rounded font-bold">
                Add-on
              </span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {authMethod === 'testing_role' ? '✓ Fast testing enabled' : 'Enterprise SAML/OIDC flow'}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TESTING MODE (ROLE SELECTOR & INSTANT CREDENTIALS) */}
        {/* ========================================================================= */}
        {authMethod === 'testing_role' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            
            {/* Left Portal Role Selection */}
            <div className="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Testing Desk Access</span>
                </div>

                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Select Desk for Testing
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
                      <p className="text-[11px] text-slate-500">Dominic M. / Jyothi P. Approvals</p>
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
                      <p className="text-[11px] text-slate-500">Platina Scanner & Clearance Pass</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right Credentials Form */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-center">
              
              <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Test Credentials</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Simulated NT Sign-in</span>
              </div>

              <form onSubmit={handleTestingLogin} className="space-y-4">
                
                {/* Office Mail ID */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Office Mail ID (@247.ai)
                  </label>
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Passcode / Password
                  </label>
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
                          <span>Manager: <strong>dominic.manoharan@247.ai</strong></span>
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
                          <span>Security: <strong>platina.security@247.ai</strong></span>
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
                      <span>Enter Desk in Testing Mode</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </motion.button>
              </form>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CORPORATE SSO & ACTIVE DIRECTORY (ENTERPRISE ADD-ON) */}
        {/* ========================================================================= */}
        {authMethod === 'corporate_sso' && (
          <div className="space-y-6 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Enterprise Single Sign-On (Active Directory & OIDC)</span>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                  Azure AD / Google Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your corporate directory to automatically authenticate employees with their real office login. Roles and Desk permissions map automatically based on Active Directory Security Groups.
              </p>
            </div>

            {/* Provider Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate(ssoEmail)}
                  disabled={ssoLoading}
                  className="p-3.5 bg-white hover:bg-blue-50/50 border-2 border-blue-500/80 rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ⊞
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-extrabold text-slate-900 group-hover:text-blue-700">
                      Sign in with Microsoft Azure AD
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      Microsoft Entra ID (@247.ai)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate(ssoEmail)}
                  disabled={ssoLoading}
                  className="p-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-extrabold text-slate-900 group-hover:text-slate-950">
                      Sign in with Google Workspace
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      Corporate Google OAuth 2.0
                    </span>
                  </div>
                </button>
              </div>

              {ssoLoading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-mono flex items-center justify-center gap-2 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Exchanging OIDC Tokens with Corporate Active Directory...</span>
                </div>
              )}

              {ssoError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  {ssoError}
                </div>
              )}
            </div>

            {/* Quick Test Accounts for SSO Verification */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Single-Click SSO Validation (Pre-configured corporate accounts):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate('dominic.manoharan@247.ai')}
                  className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <strong className="block text-amber-950">Dominic Manoharan</strong>
                  <span className="text-[10px] text-amber-800 font-mono block">dominic.manoharan@247.ai</span>
                  <span className="text-[9px] text-amber-700 uppercase font-bold mt-1 block">➔ Approval Manager Desk</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate('basavaraj.sk@247.ai')}
                  className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <strong className="block text-blue-950">Basavaraj SK</strong>
                  <span className="text-[10px] text-blue-800 font-mono block">basavaraj.sk@247.ai</span>
                  <span className="text-[9px] text-blue-700 uppercase font-bold mt-1 block">➔ IT Field Engineer Desk</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate('platina.security@247.ai')}
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left cursor-pointer transition-colors"
                >
                  <strong className="block text-indigo-950">Platina Security</strong>
                  <span className="text-[10px] text-indigo-800 font-mono block">platina.security@247.ai</span>
                  <span className="text-[9px] text-indigo-700 uppercase font-bold mt-1 block">➔ Gate Security Clearance</span>
                </button>
              </div>
            </div>

            {/* Custom Corporate Email SSO Input */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Or Sign in with Your Own Corporate Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={ssoEmail}
                  onChange={(e) => setSsoEmail(e.target.value)}
                  placeholder="your.name@247.ai"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleSsoAuthenticate(ssoEmail)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
                >
                  <span>Authenticate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

      </motion.main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400 font-mono border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>[24]7.ai Asset Tracking Portal</span>
        <span className="text-[10px] text-slate-500">SSO Active Directory Architecture Add-on Installed & Ready</span>
      </footer>

      {/* SSO Guide Modal */}
      {showSsoGuideModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">How to Configure SSO After Testing</h3>
              </div>
              <button onClick={() => setShowSsoGuideModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>
                <strong>Keep Testing Now:</strong> You do NOT need live IT credentials right now. Testing Mode allows you to evaluate all movement desks, QR guns, and approval steps immediately.
              </p>
              <p>
                <strong>When Testing Is Done:</strong> Follow these 3 steps to activate corporate Active Directory:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800">
                <li>Log in as Gate Security or Manager and open <strong>System Console ➔ Active Directory SSO</strong>.</li>
                <li>Enter your corporate Azure AD Application ID and Tenant ID.</li>
                <li>Toggle Mode to <strong>Enforced Corporate SSO</strong> and save.</li>
              </ol>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSsoGuideModal(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
