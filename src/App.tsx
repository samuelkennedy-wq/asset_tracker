import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Database, 
  ScanBarcode, 
  Plus, 
  CheckCircle2, 
  Mail, 
  Gauge, 
  Terminal, 
  RefreshCw,
  Compass,
  Settings,
  Server,
  Monitor,
  Smartphone,
  RotateCw,
  FileSpreadsheet,
  LogOut,
  UserCheck,
  Camera,
  Users,
  UserPlus
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import ScannerGate from './components/ScannerGate';
import MovementDesk from './components/MovementDesk';
import ApprovalManagerDesk from './components/ApprovalManagerDesk';
import FloorMap7th from './components/FloorMap7th';
import EmailQueueView from './components/EmailQueueView';
import PerformanceBench from './components/PerformanceBench';
import ServerTerminal from './components/ServerTerminal';
import AdminReportingView from './components/AdminReportingView';
import LoginPage from './components/LoginPage';
import HardwareBarcodeScanner from './components/HardwareBarcodeScanner';
import { validateAndCleanSerial } from './utils/serialValidator';

import { Asset, MovementTicket, EmailQueue, SystemLog, DashboardStats, GateScanLog } from './types';

import UserRolesManager from './components/UserRolesManager';

type PrimaryModule = 'module_a_engineer' | 'module_b_manager' | 'module_c_security';
type ModuleASubTab = 'tickets' | 'approvals' | 'gate_security' | 'floor_map' | 'asset_directory';
type ModuleBSubTab = 'approvals' | 'master_export' | 'roles_management';
type ModuleCSubTab = 'gate_scanner' | 'mail_system';
type AdminSubTab = 'email' | 'terminal' | 'benchmark';

export default function App() {
  // Authentication & Session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<{ name: string; empId: string } | null>(null);
  const [userRole, setUserRole] = useState<PrimaryModule>('module_a_engineer');

  const [activePrimaryModule, setActivePrimaryModule] = useState<PrimaryModule>('module_a_engineer');
  const [moduleASubTab, setModuleASubTab] = useState<ModuleASubTab>('tickets');
  const [moduleBSubTab, setModuleBSubTab] = useState<ModuleBSubTab>('approvals');
  const [moduleCSubTab, setModuleCSubTab] = useState<ModuleCSubTab>('gate_scanner');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('email');
  
  // App-level shared states synced with backend
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tickets, setTickets] = useState<MovementTicket[]>([]);
  const [emailQueue, setEmailQueue] = useState<EmailQueue[]>([]);
  const [scanLogs, setScanLogs] = useState<GateScanLog[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    pendingTickets: 0,
    validScansCount: 0,
    blockedScansCount: 0,
    queuedEmailsCount: 0
  });

  // Direct scan deep-link helper
  const [selectedBarcodeForScan, setSelectedBarcodeForScan] = useState<string>('');
  const [showGlobalScanner, setShowGlobalScanner] = useState<boolean>(false);
  const [syncing, setSyncing] = useState(false);
  const [screenMode, setScreenMode] = useState<'web' | 'mobile'>('web');

  const handleGlobalScanSuccess = (decodedText: string) => {
    setShowGlobalScanner(false);
    const valResult = validateAndCleanSerial(decodedText);

    if (!valResult.isValid) {
      alert(valResult.error || 'INVALID SCAN: Web URLs (HTTPS://...) are strictly prohibited. Only clean CPU Serial Numbers are permitted.');
      return;
    }

    const cleanSerial = valResult.cleanSerial;
    setSelectedBarcodeForScan(cleanSerial);

    if (userRole === 'module_c_security' || userRole === 'module_b_manager') {
      setActivePrimaryModule('module_c_security');
      setModuleCSubTab('gate_scanner');
    } else {
      setActivePrimaryModule('module_a_engineer');
      setModuleASubTab('tickets');
    }
  };

  // Sync state function from server
  const syncWithServer = async () => {
    setSyncing(true);
    try {
      await Promise.allSettled([
        fetch('/api/status')
          .then(res => res.ok ? res.json() : null)
          .then(statsData => {
            if (statsData) {
              setStats({
                totalAssets: statsData.totalAssets ?? 0,
                pendingTickets: statsData.pendingTickets ?? 0,
                validScansCount: statsData.validScansCount ?? 0,
                blockedScansCount: statsData.blockedScansCount ?? 0,
                queuedEmailsCount: statsData.queuedEmailsCount ?? 0
              });
              if (statsData.is_internet_online !== undefined) {
                setIsOnline(statsData.is_internet_online);
              }
            }
          })
          .catch(() => {}),

        fetch('/api/assets')
          .then(res => res.ok ? res.json() : null)
          .then(assetsData => { if (assetsData) setAssets(assetsData); })
          .catch(() => {}),

        fetch('/api/movement/tickets')
          .then(res => res.ok ? res.json() : null)
          .then(ticketsData => { if (ticketsData) setTickets(ticketsData); })
          .catch(() => {}),

        fetch('/api/scan/logs')
          .then(res => res.ok ? res.json() : null)
          .then(scanLogsData => { if (scanLogsData) setScanLogs(scanLogsData); })
          .catch(() => {}),

        fetch('/api/email/queue')
          .then(res => res.ok ? res.json() : null)
          .then(emailData => { if (emailData) setEmailQueue(emailData); })
          .catch(() => {}),

        fetch('/api/system/logs')
          .then(res => res.ok ? res.json() : null)
          .then(logsData => { if (logsData) setLogs(logsData); })
          .catch(() => {})
      ]);
    } catch {
      // Catch any unexpected sync runner errors silently
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    syncWithServer();
    const interval = setInterval(() => {
      syncWithServer();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleInternet = async () => {
    try {
      const res = await fetch('/api/email/toggle-internet', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.is_internet_online);
        syncWithServer();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDb = async () => {
    try {
      const res = await fetch('/api/test/reset', {
        method: 'POST'
      });
      if (res.ok) {
        syncWithServer();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (role: PrimaryModule, userDetails: { name: string; empId: string }) => {
    setUserRole(role);
    setActivePrimaryModule(role);
    setAuthUser(userDetails);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthUser(null);
  };

  const handleSelectBarcodeForScan = (barcode: string) => {
    setSelectedBarcodeForScan(barcode);
    if (activePrimaryModule === 'module_a_engineer') {
      setModuleASubTab('gate_security');
    } else {
      setActivePrimaryModule('module_c_security');
      setModuleCSubTab('gate_scanner');
    }
  };

  const getRoleAuthorityLabel = () => {
    if (authUser) {
      return `${authUser.name} [ID: ${authUser.empId}]`;
    }
    switch (activePrimaryModule) {
      case 'module_b_manager':
        return 'IT Approval Manager (Dominic Manoharan - dominic.manoharan@247.ai)';
      case 'module_a_engineer':
        return 'IT Request Field Engineer';
      case 'module_c_security':
        return 'Gate Security Clearance Officer';
      default:
        return 'System Operator';
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="root-layout">
      
      {/* TOP HEADER COMMAND BAR */}
      <header className="bg-white border-b border-slate-200 shadow-sm shrink-0" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm font-mono shadow-sm shrink-0">
              24/7
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  [24]7.ai Asset Tracking
                </h1>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                User: <strong className="text-slate-800">{authUser?.name || 'Authorized Engineer'}</strong> ({authUser?.empId})
              </p>
            </div>
          </div>

          {/* Top Controls & Screen Switcher & Logout */}
          <div className="flex items-center gap-2.5 text-xs">

            {/* Screen Mode Switcher */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setScreenMode('web')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  screenMode === 'web'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Web</span>
              </button>
              <button
                onClick={() => setScreenMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  screenMode === 'mobile'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
              <span>Sign Out</span>
            </button>

          </div>

        </div>

      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5" id="main-content">

        {/* WORKSPACE MODULE SELECTOR - ROLE BASED SELECTION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" id="workspace-module-selector">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center space-x-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>
                {userRole === 'module_b_manager'
                  ? 'Administrator Portal'
                  : userRole === 'module_a_engineer'
                  ? 'IT Field Engineer Portal'
                  : 'Gate Security Clearance Portal'}
              </span>
            </div>
          </div>

          {/* Module Cards Selection - Admin Manager gets full 3-module switcher; Engineers & Security get isolated portal header */}
          {userRole === 'module_b_manager' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MODULE A: IT ENGINEER */}
              <motion.button
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActivePrimaryModule('module_a_engineer')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  activePrimaryModule === 'module_a_engineer'
                    ? 'bg-blue-50/80 border-blue-500 text-slate-900 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                  A
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">IT Field Engineer Desk</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ticket Creation & Floor Maps
                  </p>
                </div>
              </motion.button>

              {/* MODULE B: APPROVAL MANAGER */}
              <motion.button
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActivePrimaryModule('module_b_manager')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer relative ${
                  activePrimaryModule === 'module_b_manager'
                    ? 'bg-blue-50/80 border-blue-500 text-slate-900 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {stats.pendingTickets > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow animate-pulse">
                    {stats.pendingTickets}
                  </span>
                )}
                <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                  B
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Approval Manager Desk</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Manager Approvals & Clearance Passes
                  </p>
                </div>
              </motion.button>

              {/* MODULE C: GATE SECURITY */}
              <motion.button
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActivePrimaryModule('module_c_security')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  activePrimaryModule === 'module_c_security'
                    ? 'bg-blue-50/80 border-blue-500 text-slate-900 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                  C
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Gate Security Clearance</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Camera Exit Scan & Audit Logs
                  </p>
                </div>
              </motion.button>
            </div>
          ) : userRole === 'module_a_engineer' ? (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  A
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">IT Field Engineer Portal</h3>
                  <p className="text-[11px] text-slate-500">CPU Movement Creation, Floor Layout & Asset Directory</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  C
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Gate Security Clearance Terminal</h3>
                  <p className="text-[11px] text-slate-500">Camera Barcode Exit Scan & Gate Audit Logs</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* EMBEDDED SUB-MODULE NAVIGATION & DESK BANNER */}
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
          
          {/* Sub-tabs for MODULE A */}
          {activePrimaryModule === 'module_a_engineer' && (
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleASubTab('tickets')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleASubTab === 'tickets'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ticket Creation Desk</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleASubTab('approvals')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all relative ${
                  moduleASubTab === 'approvals'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>My Approval Status</span>
                {stats.pendingTickets > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {stats.pendingTickets}
                  </span>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleASubTab('floor_map')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleASubTab === 'floor_map'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>7th Floor Map</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleASubTab('asset_directory')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleASubTab === 'asset_directory'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Asset Directory</span>
              </motion.button>
            </div>
          )}

          {/* Sub-tabs for MODULE B */}
          {activePrimaryModule === 'module_b_manager' && (
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleBSubTab('approvals')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleBSubTab === 'approvals'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pending Approvals ({stats.pendingTickets})</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleBSubTab('master_export')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleBSubTab === 'master_export'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Audit & Reports</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleBSubTab('roles_management')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleBSubTab === 'roles_management'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>User Roles & Permissions</span>
              </motion.button>
            </div>
          )}

          {/* Sub-tabs for MODULE C */}
          {activePrimaryModule === 'module_c_security' && (
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleCSubTab('gate_scanner')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleCSubTab === 'gate_scanner'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>Gate Camera Scanner</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setModuleCSubTab('mail_system')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  moduleCSubTab === 'mail_system'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>System Console</span>
              </motion.button>
            </div>
          )}

        </div>

        {/* WORKSPACE VIEW CONTENT RENDERER */}
        <div className="flex-1 min-h-0 relative" id="main-view-box">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePrimaryModule}-${moduleASubTab}-${moduleBSubTab}-${moduleCSubTab}-${adminSubTab}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full"
            >
              {/* MODULE A views */}
              {activePrimaryModule === 'module_a_engineer' && (
                <>
                  {moduleASubTab === 'tickets' && (
                    <MovementDesk
                      assets={assets}
                      tickets={tickets}
                      onRefresh={syncWithServer}
                    />
                  )}

                  {moduleASubTab === 'approvals' && (
                    <ApprovalManagerDesk
                      tickets={tickets}
                      assets={assets}
                      onRefresh={syncWithServer}
                      onNavigateToGateSecurity={userRole === 'module_b_manager' ? handleSelectBarcodeForScan : undefined}
                      isReadOnly={userRole !== 'module_b_manager'}
                    />
                  )}

                  {moduleASubTab === 'gate_security' && (
                    <ScannerGate
                      assets={assets}
                      tickets={tickets}
                      scanLogs={scanLogs}
                      onRefresh={syncWithServer}
                      initialSelectedBarcode={selectedBarcodeForScan}
                    />
                  )}

                  {moduleASubTab === 'floor_map' && (
                    <FloorMap7th
                      assets={assets}
                      tickets={tickets}
                      onRefresh={syncWithServer}
                      onSelectBarcodeForScan={handleSelectBarcodeForScan}
                      onNavigateToTab={(tab) => {
                        if (tab === 'scanner') {
                          if (userRole === 'module_b_manager' || userRole === 'module_c_security') {
                            setActivePrimaryModule('module_c_security');
                            setModuleCSubTab('gate_scanner');
                          } else {
                            alert('Gate Security Scanner access is restricted to Gate Security Officers and Approval Managers.');
                          }
                        }
                        if (tab === 'movement') {
                          setActivePrimaryModule('module_a_engineer');
                          setModuleASubTab('tickets');
                        }
                      }}
                    />
                  )}

                  {moduleASubTab === 'asset_directory' && (
                    <Dashboard
                      assets={assets}
                      tickets={tickets}
                      stats={stats}
                      onRefresh={syncWithServer}
                      onSelectBarcodeForScan={handleSelectBarcodeForScan}
                    />
                  )}
                </>
              )}

              {/* MODULE B views */}
              {activePrimaryModule === 'module_b_manager' && (
                <>
                  {moduleBSubTab === 'approvals' && (
                    <ApprovalManagerDesk
                      tickets={tickets}
                      assets={assets}
                      onRefresh={syncWithServer}
                      onNavigateToGateSecurity={handleSelectBarcodeForScan}
                    />
                  )}

                  {moduleBSubTab === 'master_export' && (
                    <AdminReportingView
                      assets={assets}
                      tickets={tickets}
                      scanLogs={scanLogs}
                      onRefresh={syncWithServer}
                    />
                  )}

                  {moduleBSubTab === 'roles_management' && (
                    <UserRolesManager
                      currentUserRole={userRole}
                      onRefresh={syncWithServer}
                      onSwitchRole={(roleId, userDetails) => {
                        if (roleId === 'module_a_engineer') {
                          setUserRole('module_a_engineer');
                          setActivePrimaryModule('module_a_engineer');
                        } else if (roleId === 'module_b_manager') {
                          setUserRole('module_b_manager');
                          setActivePrimaryModule('module_b_manager');
                        } else if (roleId === 'module_c_security') {
                          setUserRole('module_c_security');
                          setActivePrimaryModule('module_c_security');
                        } else {
                          setUserRole('module_b_manager');
                          setActivePrimaryModule('module_b_manager');
                        }
                        if (userDetails) {
                          setAuthUser(userDetails);
                        }
                      }}
                    />
                  )}
                </>
              )}

              {/* MODULE C views */}
              {activePrimaryModule === 'module_c_security' && (
                <>
                  {moduleCSubTab === 'gate_scanner' && (
                    <ScannerGate
                      assets={assets}
                      tickets={tickets}
                      scanLogs={scanLogs}
                      onRefresh={syncWithServer}
                      initialSelectedBarcode={selectedBarcodeForScan}
                    />
                  )}

                  {moduleCSubTab === 'mail_system' && (
                    <div className="space-y-4">
                      {/* Admin Sub-navigation */}
                      <div className="flex border-b border-slate-800 font-mono text-xs">
                        <button
                          onClick={() => setAdminSubTab('email')}
                          className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            adminSubTab === 'email'
                              ? 'border-teal-400 text-teal-300 bg-slate-900/50'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                          <span>Offline Event Mail Queue</span>
                          {stats.queuedEmailsCount > 0 && (
                            <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {stats.queuedEmailsCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setAdminSubTab('terminal')}
                          className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            adminSubTab === 'terminal'
                              ? 'border-teal-400 text-teal-300 bg-slate-900/50'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Terminal className="w-4 h-4" />
                          <span>Server Console Logs</span>
                        </button>

                        <button
                          onClick={() => setAdminSubTab('benchmark')}
                          className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            adminSubTab === 'benchmark'
                              ? 'border-teal-400 text-teal-300 bg-slate-900/50'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Gauge className="w-4 h-4" />
                          <span>100-Scan Bench Suite</span>
                        </button>
                      </div>

                      {adminSubTab === 'email' && (
                        <EmailQueueView
                          emailQueue={emailQueue}
                          isOnline={isOnline}
                          onToggleInternet={handleToggleInternet}
                          onRefresh={syncWithServer}
                        />
                      )}

                      {adminSubTab === 'terminal' && (
                        <ServerTerminal
                          logs={logs}
                          onRefresh={syncWithServer}
                          onResetDb={handleResetDb}
                        />
                      )}

                      {adminSubTab === 'benchmark' && <PerformanceBench />}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Global Hardware Barcode Scanner Modal */}
      <AnimatePresence>
        {showGlobalScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <HardwareBarcodeScanner
                title="Global Hardware USB/Bluetooth Barcode Reader"
                onSingleScan={(decoded) => {
                  handleGlobalScanSuccess(decoded);
                  setShowGlobalScanner(false);
                }}
                onBulkScanSubmit={(scannedItems) => {
                  if (scannedItems.length > 0) {
                    handleGlobalScanSuccess(scannedItems[0].serialNumber);
                  }
                  setShowGlobalScanner(false);
                }}
                onClose={() => setShowGlobalScanner(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-[#050a15] border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-mono shrink-0" id="main-footer">
        <div>[24]7.ai Asset Custody Control System • Standard Output Gateway</div>
        <div className="text-[10px] text-slate-600 mt-1">
          Configured Mail Receiver: amg@247.ai | Security Personnel Duty System
        </div>
      </footer>

    </div>
  );
}
