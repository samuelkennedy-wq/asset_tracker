import CompanyLogo from './CompanyLogo';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MovementTicket, Asset } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  Download, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  ScanBarcode, 
  Search, 
  User, 
  MapPin, 
  Calendar, 
  FileText, 
  Printer, 
  ChevronRight, 
  Edit3, 
  Save, 
  ArrowRightLeft, 
  Building2, 
  Shield, 
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';
import HardwareBarcodeScanner from './HardwareBarcodeScanner';
import Papa from 'papaparse';

const FLOOR_OPTIONS = [
  'IT Room', 'Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5',
  'Floor 6', 'Floor 7', 'Floor 8', 'Floor 9', 'Floor 12'
];

const SYSTEM_MOVEMENT_ENGINEERS = [
  'Basavaraj',
  'Murugesh',
  'Vishal',
  'Mahantesh'
];

interface ApprovalManagerDeskProps {
  tickets: MovementTicket[];
  assets: Asset[];
  onRefresh: () => void;
  onNavigateToGateSecurity?: (barcode?: string) => void;
  isReadOnly?: boolean;
}

export default function ApprovalManagerDesk({ 
  tickets, 
  assets, 
  onRefresh, 
  onNavigateToGateSecurity,
  isReadOnly = false 
}: ApprovalManagerDeskProps) {
  // Jira-Style Selected Ticket Drawer / Modal state
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Manager Credentials (for audit stamp)
  const [managerName, setManagerName] = useState('Dominic Manoharan');
  const [employeeId, setEmployeeId] = useState('dominic.manoharan@247.ai');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Action Loading state
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [justApprovedPass, setJustApprovedPass] = useState<{ clearanceId: string; serial: string; ticketNo: string } | null>(null);
  const [rejectingTicket, setRejectingTicket] = useState<MovementTicket | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Destination floor allocation policy non-compliance');

  // Inside-Ticket Edit Mode
  const [isEditingInside, setIsEditingInside] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // Find currently selected ticket
  const activeTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Synchronize editForm whenever activeTicket changes
  const initEditForm = (t: MovementTicket) => {
    setEditForm({
      ticket_no: t.ticket_no || `#TKT-${t.id}`,
      asset_serial_number: t.asset_serial_number || '',
      asset_barcode: t.asset_barcode || '',
      asset_type: t.asset_type || 'CPU',
      requestor_name: t.requestor_name || '',
      requestor_emp_id: t.requestor_emp_id || '',
      engineer_name: t.engineer_name || '',
      engineer_emp_id: t.engineer_emp_id || '',
      origin_location: t.origin_location || 'IT_ROOM',
      destination_floor: t.destination_floor || '',
      target_room: t.target_room || '',
      port_number: t.port_number || '',
      reason: t.reason || '',
      status: t.status || 'PENDING',
      rejection_reason: t.rejection_reason || '',
      clearance_id: t.clearance_id || ''
    });
  };

  const handleOpenJiraDrawer = (t: MovementTicket) => {
    setSelectedTicketId(t.id);
    initEditForm(t);
    setIsEditingInside(false);
    setEditSuccessMsg('');
  };

  // Filtered tickets for the clean Jira list
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (t.ticket_no && t.ticket_no.toLowerCase().includes(q)) ||
        (t.asset_serial_number && t.asset_serial_number.toLowerCase().includes(q)) ||
        (t.asset_barcode && t.asset_barcode.toLowerCase().includes(q)) ||
        (t.requestor_name && t.requestor_name.toLowerCase().includes(q)) ||
        (t.engineer_name && t.engineer_name.toLowerCase().includes(q)) ||
        (t.destination_floor && t.destination_floor.toLowerCase().includes(q)) ||
        (t.port_number && t.port_number.toLowerCase().includes(q))
      );
    });
  }, [tickets, statusFilter, searchQuery]);

  // Quick Approve Inside Ticket
  const handleApprove = async (ticket: MovementTicket) => {
    setActionLoading(ticket.id);
    try {
      const res = await fetch(`/api/movement/tickets/${ticket.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          manager_name: managerName,
          manager_emp_id: employeeId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJustApprovedPass({
          clearanceId: data.ticket?.clearance_id || ticket.ticket_no || `#TKT-${ticket.id}`,
          serial: ticket.asset_serial_number || ticket.asset_barcode,
          ticketNo: ticket.ticket_no || `#TKT-${ticket.id}`
        });
        setEditSuccessMsg(`✓ Ticket [${ticket.ticket_no || `#TKT-${ticket.id}`}] APPROVED! Digital clearance generated.`);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Approval failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to approval service.');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Inside Ticket
  const handleConfirmReject = async () => {
    if (!rejectingTicket) return;
    if (!rejectionReason.trim()) {
      alert('A mandatory rejection reason is required for audit compliance.');
      return;
    }
    setActionLoading(rejectingTicket.id);
    try {
      const res = await fetch(`/api/movement/tickets/${rejectingTicket.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          manager_name: managerName,
          manager_emp_id: employeeId,
          rejection_reason: rejectionReason
        })
      });
      if (res.ok) {
        setRejectingTicket(null);
        setEditSuccessMsg(`Ticket [${rejectingTicket.ticket_no || `#TKT-${rejectingTicket.id}`}] marked as REJECTED.`);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Rejection failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network failure rejecting ticket.');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Full Edit inside Ticket
  const handleSaveTicketEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/movement/tickets/${activeTicket.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditSuccessMsg(`✓ Ticket [${editForm.ticket_no}] updated with Manager Write Privileges!`);
        setIsEditingInside(false);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save ticket changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating ticket.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    const csvData = tickets.map(t => ({
      'Ticket Number': t.ticket_no || `#TKT-${t.id}`,
      'Asset Serial Number': t.asset_serial_number,
      'Asset Barcode': t.asset_barcode,
      'Origin': t.origin_location,
      'Destination Floor': t.destination_floor,
      'Target Room': t.target_room,
      'Port Number': t.port_number,
      'Requestor': t.requestor_name,
      'Field Engineer': t.engineer_name,
      'Status': t.status,
      'Approved By': t.approved_by_name || 'N/A',
      'Created At': t.created_at
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `247ai_Manager_Approval_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4" id="approval-manager-desk">
      {/* Clean Jira Desk Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <CompanyLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Manager Approval Desk
              </h2>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                JIRA TICKET WORKFLOW
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any ticket row to open the complete ticket record, inspect all movement parameters, and execute manager approval rights.
            </p>
          </div>
        </div>

        {/* Manager ID Switcher & Global Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => { setManagerName('Dominic Manoharan'); setEmployeeId('dominic.manoharan@247.ai'); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                employeeId.includes('dominic') ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dominic M.
            </button>
            <button
              type="button"
              onClick={() => { setManagerName('Jyothi Potula'); setEmployeeId('jyothi.potula'); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                employeeId.includes('jyothi') ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jyothi P.
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
            const count = s === 'ALL' ? tickets.length : tickets.filter(t => t.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{s === 'ALL' ? 'All Tickets' : s}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === s ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar + Hardware Scanner */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Ticket #, CPU Serial, Employee, Floor..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 uppercase"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <ScanBarcode className="w-4 h-4 text-amber-400" />
            <span>Scan Gun</span>
          </button>
        </div>
      </div>

      {/* Jira-Style Ticket Queue Table (Clean 1-Line Per Ticket) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ticket Key</th>
                <th className="px-4 py-3">Hardware Serial</th>
                <th className="px-4 py-3">Movement Route</th>
                <th className="px-4 py-3">Target Bay / Port</th>
                <th className="px-4 py-3">Requestor & Engineer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No tickets found matching the selected filter or search query.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isBlocked = (t.gateway_clearance_status === 'BLOCKED' || t.gateway_clearance_status === 'DENIED');
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenJiraDrawer(t)}
                      className={`hover:bg-blue-50/60 cursor-pointer transition-colors ${
                        selectedTicketId === t.id ? 'bg-blue-50/80 font-medium' : ''
                      }`}
                    >
                      {/* Ticket Key Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md inline-flex items-center gap-1.5 group-hover:bg-blue-600 group-hover:text-white">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>{t.ticket_no || `#TKT-${t.id}`}</span>
                        </span>
                      </td>

                      {/* Hardware Serial */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {t.asset_serial_number || t.asset_barcode}
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-600">{t.origin_location || 'IT_ROOM'}</span>
                        <span className="mx-1.5 text-blue-500">➔</span>
                        <strong className="text-slate-900">{t.destination_floor}</strong>
                      </td>

                      {/* Room & Port */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700">{t.target_room || 'Floor Bay'}</span>
                        {t.port_number && (
                          <span className="ml-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {t.port_number}
                          </span>
                        )}
                      </td>

                      {/* Requestor */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{t.requestor_name}</span>
                        {t.engineer_name && (
                          <span className="text-[11px] text-slate-500 font-mono ml-1">({t.engineer_name})</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isBlocked ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-black bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                            ⚠️ GATE BLOCKED
                          </span>
                        ) : t.status === 'APPROVED' ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                            ✓ APPROVED
                          </span>
                        ) : t.status === 'REJECTED' ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                            ✕ REJECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                            ● PENDING
                          </span>
                        )}
                      </td>

                      {/* View Details CTA */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenJiraDrawer(t);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Ticket</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* JIRA-STYLE FULL DETAIL MODAL / DRAWER (EVERY DETAIL & RIGHT IS INSIDE IT) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.96, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 15 }}
              className="bg-white border border-slate-300 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Jira Modal Top Ribbon */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                        {activeTicket.ticket_no || `#TKT-${activeTicket.id}`}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        activeTicket.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        activeTicket.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {activeTicket.status}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      CPU Asset Movement Authorization Request
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Ticket"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Feedback Alert if edited or approved */}
              {editSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-900 text-xs font-bold flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{editSuccessMsg}</span>
                  </div>
                  <button onClick={() => setEditSuccessMsg('')} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
                </div>
              )}

              {/* Ticket Body: Toggle between Read / Inspect View vs Full Manager Edit View */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {isEditingInside ? (
                  /* ================= FULL MANAGER WRITE EDIT FORM ================= */
                  <form onSubmit={handleSaveTicketEdits} className="space-y-4 bg-slate-50 border border-blue-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-blue-600" />
                        <span>Manager Full Override & Parameter Editor</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">Full Write Rights</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Ticket Number *</label>
                        <input
                          type="text"
                          required
                          value={editForm.ticket_no}
                          onChange={(e) => setEditForm({ ...editForm, ticket_no: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-900 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CPU Serial Number *</label>
                        <input
                          type="text"
                          required
                          value={editForm.asset_serial_number}
                          onChange={(e) => setEditForm({ ...editForm, asset_serial_number: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Destination Floor *</label>
                        <select
                          value={editForm.destination_floor}
                          onChange={(e) => setEditForm({ ...editForm, destination_floor: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                        >
                          {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Target Room / Bay</label>
                        <input
                          type="text"
                          value={editForm.target_room}
                          onChange={(e) => setEditForm({ ...editForm, target_room: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Switch Port Number *</label>
                        <input
                          type="text"
                          value={editForm.port_number}
                          onChange={(e) => setEditForm({ ...editForm, port_number: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-indigo-50 border border-indigo-300 rounded-lg font-mono font-bold text-indigo-950 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Requestor Name</label>
                        <input
                          type="text"
                          value={editForm.requestor_name}
                          onChange={(e) => setEditForm({ ...editForm, requestor_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Field Engineer</label>
                        <select
                          value={editForm.engineer_name}
                          onChange={(e) => setEditForm({ ...editForm, engineer_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                        >
                          {SYSTEM_MOVEMENT_ENGINEERS.map(eng => <option key={eng} value={eng}>{eng}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Status Override</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Reason / Justification</label>
                      <textarea
                        rows={2}
                        value={editForm.reason}
                        onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingInside(false)}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saveLoading ? 'Saving Changes...' : 'Save Ticket Changes'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ================= STANDARD JIRA COMPACT METADATA VIEW ================= */
                  <div className="space-y-4">
                    {/* Primary Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Hardware Serial</span>
                        <div className="font-mono text-base font-black text-slate-950">
                          {activeTicket.asset_serial_number || activeTicket.asset_barcode}
                        </div>
                        <span className="text-[11px] text-slate-500 block">Type: {activeTicket.asset_type || 'CPU'}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Movement Route</span>
                        <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>{activeTicket.origin_location || 'IT_ROOM'}</span>
                          <span className="text-blue-500">➔</span>
                          <span className="text-blue-900">{activeTicket.destination_floor}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">Room: {activeTicket.target_room || 'General Area'}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block">Network Switch Port</span>
                        <div className="font-mono text-base font-black text-indigo-950">
                          {activeTicket.port_number || 'N/A (Pending Patch)'}
                        </div>
                        <span className="text-[11px] text-slate-500 block">Floor Allocation Verified</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Requestor Details</span>
                        <div className="text-sm font-bold text-slate-900">
                          {activeTicket.requestor_name}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block">ID: {activeTicket.requestor_emp_id || 'Corporate Employee'}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Assigned Engineer</span>
                        <div className="text-sm font-bold text-slate-900">
                          {activeTicket.engineer_name || 'Basavaraj SK'}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block">Emp ID: {activeTicket.engineer_emp_id || '01099318'}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Created Timestamp</span>
                        <div className="text-xs font-mono font-bold text-slate-800">
                          {activeTicket.created_at ? new Date(activeTicket.created_at).toLocaleString() : 'N/A'}
                        </div>
                        <span className="text-[11px] text-slate-500 block">Registered in Central DB</span>
                      </div>
                    </div>

                    {/* Movement Justification */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Business Reason / Justification</span>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {activeTicket.reason || 'IT Infrastructure deployment / authorized workstation upgrade.'}
                      </p>
                    </div>

                    {/* Historical Floor Linkage (if return to IT room) */}
                    {activeTicket.previous_floor_ticket_no && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">Floor Return Backtrack Chain</span>
                        <p className="text-xs text-amber-950 font-mono">
                          Origin Floor Ticket: <strong>{activeTicket.previous_floor_ticket_no}</strong> ({activeTicket.previous_floor}) • Port: {activeTicket.previous_port_number || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ================= JIRA ACTION BAR INSIDE THE TICKET ================= */}
              {/* Every Manager Right Is Contained Here */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {!isEditingInside && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setIsEditingInside(true)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Ticket Details</span>
                    </button>
                  )}

                  {onNavigateToGateSecurity && activeTicket.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => onNavigateToGateSecurity(activeTicket.clearance_id || activeTicket.ticket_no || activeTicket.asset_serial_number)}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open in Gate Terminal ➔</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {/* Reject Button */}
                  {activeTicket.status !== 'REJECTED' && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setRejectingTicket(activeTicket)}
                      disabled={actionLoading === activeTicket.id}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Reject Movement</span>
                    </button>
                  )}

                  {/* Approve Button */}
                  {activeTicket.status !== 'APPROVED' && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleApprove(activeTicket)}
                      disabled={actionLoading === activeTicket.id}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-700/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{actionLoading === activeTicket.id ? 'Approving...' : 'Approve & Issue Clearance'}</span>
                    </button>
                  )}

                  {activeTicket.status === 'APPROVED' && (
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-900 font-mono font-extrabold text-xs rounded-xl border border-emerald-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>CLEARED & AUTHORIZED</span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Confirmation Modal */}
      <AnimatePresence>
        {rejectingTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold text-sm">Mandatory Rejection Audit Reason</h4>
              </div>
              <p className="text-xs text-slate-600">
                Specify the compliance reason for rejecting Ticket <strong>{rejectingTicket.ticket_no || `#TKT-${rejectingTicket.id}`}</strong>:
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Destination floor allocation policy non-compliance, unauthorized port assignment..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-medium"
              />
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingTicket(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading === rejectingTicket.id}
                  className="px-5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hardware Barcode Scanner Modal */}
      <AnimatePresence>
        {showScannerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ScanBarcode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Scan Hardware Barcode</h3>
                </div>
                <button onClick={() => setShowScannerModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>
              <HardwareBarcodeScanner
                targetMode="TICKET"
                onScan={(val) => {
                  setSearchQuery(val);
                  setShowScannerModal(false);
                }}
                onClose={() => setShowScannerModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
