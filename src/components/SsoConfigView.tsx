import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Building2, 
  CheckCircle2, 
  ExternalLink, 
  Save, 
  Lock, 
  Cpu, 
  Users, 
  Globe, 
  AlertCircle, 
  Check, 
  HelpCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
  Server
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';

interface SsoConfig {
  authMode: 'TESTING_ROLE_SELECTOR' | 'ENTERPRISE_SSO_ONLY';
  provider: 'azure_ad' | 'google_workspace' | 'okta';
  tenantId: string;
  clientId: string;
  clientSecretConfigured: boolean;
  allowedDomain: string;
  redirectUri: string;
  adGroupMappings: {
    managerGroup: string;
    securityGroup: string;
    engineerGroup: string;
  };
}

const DEFAULT_SSO_CONFIG: SsoConfig = {
  authMode: 'TESTING_ROLE_SELECTOR',
  provider: 'azure_ad',
  tenantId: '247ai-corp-directory-tenant-id',
  clientId: '01a2b3c4-5678-90ab-cdef-247ai0000001',
  clientSecretConfigured: true,
  allowedDomain: '@247.ai',
  redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback`,
  adGroupMappings: {
    managerGroup: 'SG-247AI-IT-APPROVAL-MANAGERS',
    securityGroup: 'SG-247AI-PLATINA-GATE-SECURITY',
    engineerGroup: 'SG-247AI-FIELD-ENGINEERS'
  }
};

export default function SsoConfigView() {
  const [config, setConfig] = useState<SsoConfig>(DEFAULT_SSO_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Test SSO Simulation
  const [testEmail, setTestEmail] = useState('dominic.manoharan@247.ai');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/sso/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.config) {
          setConfig(data.config);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/auth/sso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to save SSO configuration', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSsoTest = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/auth/sso/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, provider: config.provider })
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({
        success: false,
        error: 'Network error validating token against identity provider.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Corporate SSO & Active Directory (AD) Integration
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                Enterprise Add-on Installed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure Azure Active Directory (Microsoft Entra ID) or Google Workspace OAuth. Keep testing active now, then activate corporate authentication when ready.
            </p>
          </div>
        </div>

        {/* Global Active Mode Switch */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Current Mode</span>
            <span className="text-xs font-bold text-slate-800">
              {config.authMode === 'TESTING_ROLE_SELECTOR' ? 'Testing Mode (Active)' : 'Enforced Corporate SSO'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfig({
              ...config,
              authMode: config.authMode === 'TESTING_ROLE_SELECTOR' ? 'ENTERPRISE_SSO_ONLY' : 'TESTING_ROLE_SELECTOR'
            })}
            className="cursor-pointer"
            title="Toggle between Testing Role Selector Mode and Corporate SSO Only"
          >
            {config.authMode === 'TESTING_ROLE_SELECTOR' ? (
              <ToggleLeft className="w-9 h-9 text-slate-400 hover:text-blue-600 transition-colors" />
            ) : (
              <ToggleRight className="w-9 h-9 text-blue-600 hover:text-blue-700 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Mode Explanation Notice */}
      {config.authMode === 'TESTING_ROLE_SELECTOR' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Testing Mode Is Currently Active</strong>
            <p className="mt-0.5 leading-relaxed text-blue-800">
              You can test all application features, tickets, scans, and approval workflows using the fast role selector (Basavaraj, Dominic M., Platina Security) with no external corporate IT credentials required. When testing is complete, you can configure your corporate Tenant ID below and switch to Enforced SSO.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-950 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Enforced Corporate SSO Mode Selected</strong>
            <p className="mt-0.5 leading-relaxed text-emerald-900">
              The login screen will require users to authenticate via their official corporate email and SSO identity provider.
            </p>
          </div>
        </div>
      )}

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Provider Settings & OIDC Credentials */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Identity Provider (IdP) Parameters</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                OIDC / SAML 2.0
              </span>
            </div>

            {/* Provider Chooser */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Select Corporate SSO Provider
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'azure_ad', label: 'Microsoft Azure AD', sub: 'Entra ID' },
                  { id: 'google_workspace', label: 'Google Workspace', sub: 'OAuth 2.0' },
                  { id: 'okta', label: 'Okta / Ping', sub: 'Enterprise OIDC' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConfig({ ...config, provider: p.id as any })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      config.provider === p.id 
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold text-xs text-slate-900">{p.label}</span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tenant ID */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Directory (Tenant) ID *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Found in Azure Portal / Google Admin</span>
              </div>
              <input
                type="text"
                required
                value={config.tenantId}
                onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Client (Application) ID */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Application (Client) ID *
              </label>
              <input
                type="text"
                required
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Allowed Email Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Allowed Email Domain
                </label>
                <input
                  type="text"
                  required
                  value={config.allowedDomain}
                  onChange={(e) => setConfig({ ...config, allowedDomain: e.target.value })}
                  placeholder="@247.ai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-900 focus:bg-white"
                />
              </div>

              {/* Redirect URI */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Redirect URI
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(config.redirectUri, 'redirect')}
                    className="text-blue-600 hover:underline text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'redirect' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'redirect' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={config.redirectUri}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Active Directory Group Mappings */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Active Directory (AD) Group Mapping</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Role RBAC Auto-Assignment</span>
              </div>
              <p className="text-[11px] text-slate-500">
                When employees authenticate via corporate SSO, their AD Security Groups automatically map them to the proper Desk:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Approval Manager Desk:</span>
                  <input
                    type="text"
                    value={config.adGroupMappings.managerGroup}
                    onChange={(e) => setConfig({
                      ...config,
                      adGroupMappings: { ...config.adGroupMappings, managerGroup: e.target.value }
                    })}
                    className="font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-1 max-w-xs w-full font-bold text-purple-900"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Gate Security Officers:</span>
                  <input
                    type="text"
                    value={config.adGroupMappings.securityGroup}
                    onChange={(e) => setConfig({
                      ...config,
                      adGroupMappings: { ...config.adGroupMappings, securityGroup: e.target.value }
                    })}
                    className="font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-1 max-w-xs w-full font-bold text-indigo-900"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">IT Field Engineers Desk:</span>
                  <input
                    type="text"
                    value={config.adGroupMappings.engineerGroup}
                    onChange={(e) => setConfig({
                      ...config,
                      adGroupMappings: { ...config.adGroupMappings, engineerGroup: e.target.value }
                    })}
                    className="font-mono text-[11px] bg-white border border-slate-300 rounded px-2 py-1 max-w-xs w-full font-bold text-blue-900"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {saveSuccess ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>SSO Configuration Saved Successfully!</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Settings persist automatically for when corporate switch occurs.
                </span>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save SSO Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Interactive Test Bench & Step-By-Step Deployment Guide */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Interactive Token Simulation Bench */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>SSO Token Verification Test Bench</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Simulator
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Test how corporate employee emails resolve Active Directory claims and map to app permissions:
            </p>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Test Employee Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="name@247.ai"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleRunSsoTest}
                  disabled={testLoading || !testEmail}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs shrink-0"
                >
                  {testLoading ? 'Testing...' : 'Test SSO'}
                </button>
              </div>
            </div>

            {/* Test Output Panel */}
            {testResult && (
              <div className="bg-slate-950 text-slate-100 p-3.5 rounded-2xl font-mono text-xs space-y-2 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Claims Token Output:</span>
                  <span className={testResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {testResult.success ? '✓ 200 TOKEN_VALIDATED' : '✕ AUTH_REJECTED'}
                  </span>
                </div>
                {testResult.success ? (
                  <div className="space-y-1 text-[11px]">
                    <div><span className="text-slate-500">Subject (sub):</span> <span className="text-cyan-300">{testResult.tokenClaims?.sub}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="text-white font-bold">{testResult.tokenClaims?.email}</span></div>
                    <div><span className="text-slate-500">Mapped Role:</span> <span className="text-amber-300 font-bold">{testResult.mappedRole}</span></div>
                    <div><span className="text-slate-500">Session Cookie:</span> <span className="text-emerald-300">Set-Cookie: jwt_auth; HttpOnly; Secure</span></div>
                  </div>
                ) : (
                  <div className="text-rose-400 text-xs">
                    {testResult.error || 'Domain check failed. Must match @247.ai.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4-Step IT Administrator Setup Guide */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <CompanyLogo size="sm" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                How to Configure in Azure AD / Google Workspace
              </h3>
            </div>

            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">Register App in Azure Portal</strong>: Navigate to <em>Entra ID ➔ App Registrations ➔ New Registration</em>. Enter <code>[24]7.ai Asset Tracker</code>.
              </li>
              <li>
                <strong className="text-white">Set Redirect URI</strong>: In Authentication, add Web Redirect URI:
                <code className="block mt-1 p-1 bg-slate-950 rounded text-cyan-300 font-mono text-[10px] break-all">
                  {config.redirectUri}
                </code>
              </li>
              <li>
                <strong className="text-white">Copy Credentials</strong>: Copy the <em>Application (Client) ID</em> and <em>Directory (Tenant) ID</em> and paste them in the form on the left.
              </li>
              <li>
                <strong className="text-white">Flip Mode to Enforce SSO</strong>: Once tested, toggle the Mode switch at the top to <em>Enforced Corporate SSO</em>.
              </li>
            </ol>
          </div>

        </div>

      </div>
    </div>
  );
}
