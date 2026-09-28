import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MovementTicket, Asset, AppUser } from '../types';
import { CheckCircle2, XCircle, ShieldCheck, UserCheck, Clock, Download, Check, AlertTriangle, ArrowRight, X, ScanBarcode, Search, Filter, Info, User, HardDrive, MapPin, Calendar, FileText, ChevronDown, ChevronUp, Edit3, Save, ArrowRightLeft, Building2, Users, UserPlus, UserMinus, Trash2, Plus, RefreshCw, Shield } from 'lucide-react';
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

export default function ApprovalManagerDesk({ tickets, assets, onRefresh, onNavigateToGateSecurity, isReadOnly = false }: ApprovalManagerDeskProps) {
  const [managerName, setManagerName] = useState('Jyothi Potula');
  const [employeeId, setEmployeeId] = useState('jyothi.potula');

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectingTicket, setRejectingTicket] = useState<MovementTicket | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Destination floor allocation policy non-compliance');
  const [justApprovedPass, setJustApprovedPass] = useState<{ clearanceId: string; serial: string } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'GATEWAY_BLOCKED'>('ALL');
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  // Asset Tracking Report Modal State (Zero Duplications)
  const [showAssetTrackingReportModal, setShowAssetTrackingReportModal] = useState(false);
  const [assetTrackingSearch, setAssetTrackingSearch] = useState('');

  // Deduplicated Tickets for End-to-End Asset Tracking Report (Zero Duplication Enforcement)
  const deduplicatedTrackingTickets = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: MovementTicket[] = [];
    for (const t of tickets) {
      const serialKey = (t.asset_serial_number || t.asset_barcode || '').trim().toUpperCase();
      const ticketKey = (t.ticket_no || `#TKT-${t.id}`).trim().toUpperCase();
      const compositeKey = `${ticketKey}:::${serialKey}`;
      if (!seen.has(compositeKey)) {
        seen.add(compositeKey);
        unique.push(t);
      }
    }
    return unique;
  }, [tickets]);

  // Full Read/Write Access Editing State for Manager
  const [editingTicket, setEditingTicket] = useState<MovementTicket | null>(null);
  const [editForm, setEditForm] = useState({
    ticket_no: '',
    asset_serial_number: '',
    asset_barcode: '',
    asset_type: 'CPU',
    requestor_name: '',
    requestor_emp_id: '',
    engineer_name: '',
    engineer_emp_id: '',
    origin_location: 'IT_ROOM',
    destination_floor: 'FLOOR_03',
    target_room: '',
    port_number: '',
    reason: '',
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
    rejection_reason: '',
    clearance_id: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  // User Role Management State (IT Field Engineer & Platina Security)
  const [showEngineerManagerModal, setShowEngineerManagerModal] = useState(false);
  const [engineersList, setEngineersList] = useState<AppUser[]>([]);
  const [engineerLoading, setEngineerLoading] = useState(false);
  const [engineerFeedback, setEngineerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Role Form State (Support creating both IT Engineer and Platina Security roles)
  const [showAddEngineerForm, setShowAddEngineerForm] = useState(false);
  const [newRoleType, setNewRoleType] = useState<'module_a_engineer' | 'module_c_security'>('module_a_engineer');
  const [newEngName, setNewEngName] = useState('');
  const [newEngEmail, setNewEngEmail] = useState('');
  const [newEngEmpId, setNewEngEmpId] = useState(`010${Math.floor(100000 + Math.random() * 900000)}`);
  const [newEngDepartment, setNewEngDepartment] = useState('IT Field Services');
  const [addingEngineer, setAddingEngineer] = useState(false);

  const fetchEngineers = async () => {
    setEngineerLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users: AppUser[] = await res.json();
        // Include both engineers and platina security personnel in the access management list
        const relevantUsers = users.filter(u => 
          u.role_id === 'module_a_engineer' || 
          u.role_id === 'module_c_security' ||
          u.department.toLowerCase().includes('field') || 
          u.department.toLowerCase().includes('it') ||
          u.department.toLowerCase().includes('security')
        );
        setEngineersList(relevantUsers.length > 0 ? relevantUsers : users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setEngineerLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const handleCreateEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEngName.trim() || !newEngEmail.trim() || !newEngEmpId.trim()) {
      setEngineerFeedback({ type: 'error', message: 'Name, email, and Employee ID are required.' });
      return;
    }

    setAddingEngineer(true);
    setEngineerFeedback(null);

    const defaultDept = newRoleType === 'module_c_security' ? 'Platina Corporate Security' : 'IT Field Services';
    const roleTitle = newRoleType === 'module_c_security' ? 'Platina Security Officer' : 'IT Field Engineer';

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEngName.trim(),
          email: newEngEmail.trim(),
          emp_id: newEngEmpId.trim(),
          role_id: newRoleType,
          department: newEngDepartment.trim() || defaultDept
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEngineerFeedback({ type: 'success', message: `User role successfully assigned! ${roleTitle} '${newEngName}' registered in system.` });
        setNewEngName('');
        setNewEngEmail('');
        setNewEngEmpId(newRoleType === 'module_c_security' ? `SEC-${Math.floor(1000 + Math.random() * 9000)}` : `010${Math.floor(100000 + Math.random() * 900000)}`);
        setShowAddEngineerForm(false);
        fetchEngineers();
      } else {
        setEngineerFeedback({ type: 'error', message: data.error || 'Failed to register user.' });
      }
    } catch (err) {
      setEngineerFeedback({ type: 'error', message: 'Network error adding user.' });
    } finally {
      setAddingEngineer(false);
    }
  };

  const handleRevokeEngineerAccess = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to revoke system access for ${userName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEngineerFeedback({ type: 'success', message: `Access revoked for IT Engineer ${userName}.` });
        fetchEngineers();
      } else {
        setEngineerFeedback({ type: 'error', message: data.error || 'Failed to revoke engineer access.' });
      }
    } catch (err) {
      setEngineerFeedback({ type: 'error', message: 'Network error revoking engineer access.' });
    }
  };

  const handleOpenEditModal = (ticket: MovementTicket) => {
    setEditingTicket(ticket);
    setEditForm({
      ticket_no: ticket.ticket_no || `#TKT-${ticket.id}`,
      asset_serial_number: ticket.asset_serial_number || '',
      asset_barcode: ticket.asset_barcode || '',
      asset_type: ticket.asset_type || 'CPU',
      requestor_name: ticket.requestor_name || '',
      requestor_emp_id: ticket.requestor_emp_id || '',
      engineer_name: ticket.engineer_name || '',
      engineer_emp_id: ticket.engineer_emp_id || '',
      origin_location: ticket.origin_location || 'IT_ROOM',
      destination_floor: ticket.destination_floor || '',
      target_room: ticket.target_room || '',
      port_number: ticket.port_number || '',
      reason: ticket.reason || '',
      status: ticket.status || 'PENDING',
      rejection_reason: ticket.rejection_reason || '',
      clearance_id: ticket.clearance_id || ''
    });
  };

  const handleSaveTicketEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    setSaveLoading(true);

    try {
      const res = await fetch(`/api/movement/tickets/${editingTicket.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const data = await res.json();
        setEditSuccessMsg(`Ticket [${editForm.ticket_no}] details successfully updated across system!`);
        setEditingTicket(null);
        onRefresh();
        setTimeout(() => setEditSuccessMsg(''), 5000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save ticket modifications.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving ticket updates.');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (t.ticket_no && t.ticket_no.toLowerCase().includes(q)) ||
      (t.asset_serial_number && t.asset_serial_number.toLowerCase().includes(q)) ||
      (t.asset_barcode && t.asset_barcode.toLowerCase().includes(q)) ||
      (t.clearance_id && t.clearance_id.toLowerCase().includes(q)) ||
      (t.requestor_name && t.requestor_name.toLowerCase().includes(q)) ||
      (t.engineer_name && t.engineer_name.toLowerCase().includes(q)) ||
      (t.gateway_blocked_reason && t.gateway_blocked_reason.toLowerCase().includes(q))
    );
  });

  const pendingTickets = filteredTickets.filter(t => t.status === 'PENDING');
  const approvedTickets = filteredTickets.filter(t => t.status === 'APPROVED');
  const rejectedTickets = filteredTickets.filter(t => t.status === 'REJECTED');
  const processedTickets = filteredTickets.filter(t => t.status !== 'PENDING');
  const gatewayBlockedTickets = filteredTickets.filter(t => 
    t.gateway_clearance_status === 'BLOCKED' || 
    t.gateway_clearance_status === 'DENIED' || 
    t.gateway_clearance_status === 'HOLD' ||
    Boolean(t.gateway_blocked_reason && t.gateway_blocked_reason.trim())
  );

  const displayedTickets = filteredTickets.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'GATEWAY_BLOCKED') {
      return t.gateway_clearance_status === 'BLOCKED' || 
             t.gateway_clearance_status === 'DENIED' || 
             t.gateway_clearance_status === 'HOLD' ||
             Boolean(t.gateway_blocked_reason && t.gateway_blocked_reason.trim());
    }
    return t.status === statusFilter;
  });

  const handleOverrideGatewayBlock = async (ticket: MovementTicket) => {
    setActionLoading(ticket.id);
    try {
      const res = await fetch(`/api/movement/tickets/${ticket.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          gateway_clearance_status: 'CLEARED',
          gateway_blocked_reason: '',
          clearance_id: ticket.ticket_no || `TKT-${ticket.id}`
        })
      });
      if (res.ok) {
        setEditSuccessMsg(`Gateway Block resolved & overridden for Ticket [${ticket.ticket_no || `#TKT-${ticket.id}`}]. Ticket is now CLEARED & APPROVED for movement!`);
        setTimeout(() => setEditSuccessMsg(''), 6000);
        onRefresh();
      } else {
        alert('Failed to override gateway clearance block.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while overriding gateway block.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickStatusChange = async (ticket: MovementTicket, newStatus: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    if (ticket.status === newStatus) return;
    setActionLoading(ticket.id);
    try {
      const res = await fetch(`/api/movement/tickets/${ticket.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          clearance_id: newStatus === 'APPROVED' ? (ticket.ticket_no || `TKT-${ticket.id}`) : ticket.clearance_id
        })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to update ticket status.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating ticket status.');
    } finally {
      setActionLoading(null);
    }
  };

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
        if (data.ticket?.clearance_id) {
          setJustApprovedPass({
            clearanceId: data.ticket.clearance_id,
            serial: ticket.asset_serial_number || ticket.asset_barcode
          });
        }
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
        setRejectionReason('Destination floor allocation policy non-compliance');
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Rejection failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to approval service.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportApprovalCSV = () => {
    if (tickets.length === 0) return;

    const exportData = tickets.map(t => ({
      'Ticket Number': t.ticket_no || `#TKT-${t.id}`,
      'Asset Serial Number': t.asset_serial_number || 'N/A',
      'Asset Barcode Tag': t.asset_barcode,
      'Asset Type': t.asset_type || 'CPU',
      'Requestor Name': t.requestor_name,
      'Requestor Emp ID': t.requestor_emp_id,
      'IT Field Engineer': t.engineer_name,
      'Engineer Emp ID': t.engineer_emp_id,
      'Source Location': t.origin_location,
      'Destination Floor': t.destination_floor,
      'Movement Reason': t.reason,
      'Approval Status': t.status,
      'Gate Clearance Pass ID': t.clearance_id || 'N/A',
      'Approving Manager Name': t.approved_by_name || (t.status !== 'PENDING' ? managerName : 'N/A'),
      'Approving Manager Emp ID': t.approved_by_id || (t.status !== 'PENDING' ? employeeId : 'N/A'),
      'Rejection Reason': t.rejection_reason || 'N/A',
      'Timestamp': t.approved_at || t.created_at
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asset_Approval_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dedicated End-to-End Asset Tracking Report CSV Export (Zero Duplications)
  const handleExportTrackingReportCSV = () => {
    const exportData = deduplicatedTrackingTickets.map((t, idx) => ({
      'SL No': idx + 1,
      'Ticket ID': t.ticket_no || `#TKT-${t.id}`,
      'Who Asked Machine (Requestor)': t.requestor_name || 'N/A',
      'Requestor Employee ID': t.requestor_emp_id || 'N/A',
      'Which Engineer Moved': t.engineer_name || 'N/A',
      'Engineer Employee ID': t.engineer_emp_id || 'N/A',
      'Who Approved': t.approved_by_name || (t.status === 'APPROVED' ? managerName : 'Pending Approval'),
      'Approver Employee ID': t.approved_by_id || (t.status === 'APPROVED' ? employeeId : 'N/A'),
      'Gate Clearance Pass ID': t.clearance_id || 'N/A',
      'Approval Status': t.status,
      'Origin Location': t.origin_location,
      'Deployment Floor': t.destination_floor,
      'Target Room / Bay': t.target_room || `Bay (${t.destination_floor})`,
      'Port Number (Switch Port)': t.port_number || 'N/A',
      'Machine Serial Number': t.asset_serial_number,
      'Machine Asset Tag / Barcode': t.asset_barcode,
      'Movement Reason': t.reason,
      'Created At': t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'
    }));

    const csv = Papa.unparse(exportData.length > 0 ? exportData : [{ Message: 'No tracking records found' }]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asset_Tracking_Report_ZeroDuplicates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5" id="approval-manager-desk">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Asset Approval Manager Desk</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, validate, and issue Gate Security Clearance Passes for pending CPU movement requests with zero-duplication tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Asset Tracking Report Button */}
          <button
            onClick={() => setShowAssetTrackingReportModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Asset Tracking Report ({deduplicatedTrackingTickets.length})</span>
          </button>

          {/* User Roles (Engineer & Platina Security) Button */}
          <button
            onClick={() => {
              fetchEngineers();
              setShowEngineerManagerModal(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>User Roles (Engineer & Platina Security)</span>
          </button>

          {onNavigateToGateSecurity && (
            <button
              onClick={() => onNavigateToGateSecurity()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Open Gate Security Terminal ➔</span>
            </button>
          )}

          <button
            onClick={handleExportApprovalCSV}
            disabled={tickets.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({tickets.length})</span>
          </button>
        </div>
      </div>

      {/* Instant Approval Success Banner with Gate Clearance Navigation */}
      <AnimatePresence>
        {justApprovedPass && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-950">Movement Authorized Under Ticket Number</span>
                  <span className="font-mono text-xs font-bold bg-white border border-emerald-300 px-2 py-0.5 rounded text-emerald-800">
                    {justApprovedPass.ticketNo || justApprovedPass.clearanceId}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-mono mt-0.5">
                  CPU Serial: {justApprovedPass.serial} — Verified with Ticket Number as sole movement identification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onNavigateToGateSecurity && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigateToGateSecurity(justApprovedPass.clearanceId)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <ScanBarcode className="w-4 h-4" />
                  <span>Open in Gate Terminal ➔</span>
                </motion.button>
              )}
              <button
                onClick={() => setJustApprovedPass(null)}
                className="p-1.5 text-emerald-700 hover:text-emerald-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Ticket Success Banner */}
      <AnimatePresence>
        {editSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-blue-50 border border-blue-300 rounded-2xl p-4 text-blue-900 flex items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs font-bold font-mono text-blue-950">{editSuccessMsg}</p>
            </div>
            <button onClick={() => setEditSuccessMsg('')} className="text-blue-500 hover:text-blue-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Search & Camera Scanner Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-2 text-xs text-slate-700 font-bold w-full md:w-auto">
          <ScanBarcode className="w-4 h-4 text-blue-600" />
          <span>Ticket / Serial Search:</span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Serial or Barcode (e.g. CPU90001, S/N-78F8A2)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
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
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Hardware Scan</span>
          </button>
        </div>
      </div>

      {/* Approval Team Members Selection (Quick Name List Buttons including jyothi.potula) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Approval Team Member Selection (Name List Button):
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
            AUTHORIZED APPROVER CLEARANCE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Jyothi Potula Button (jyothi.potula) */}
          <button
            type="button"
            onClick={() => {
              setManagerName('Jyothi Potula');
              setEmployeeId('jyothi.potula');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs ${
              managerName.toLowerCase().includes('jyothi') || employeeId.toLowerCase().includes('jyothi')
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300'
                : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-300'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${managerName.toLowerCase().includes('jyothi') || employeeId.toLowerCase().includes('jyothi') ? 'text-white' : 'text-slate-300'}`} />
            <span>jyothi.potula</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${managerName.toLowerCase().includes('jyothi') || employeeId.toLowerCase().includes('jyothi') ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
              Senior Approver
            </span>
          </button>

          {/* Dominic Manoharan Button */}
          <button
            type="button"
            onClick={() => {
              setManagerName('Dominic Manoharan');
              setEmployeeId('dominic.manoharan@247.ai');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs ${
              managerName.toLowerCase().includes('dominic') || employeeId.toLowerCase().includes('dominic')
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-300'
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${managerName.toLowerCase().includes('dominic') || employeeId.toLowerCase().includes('dominic') ? 'text-white' : 'text-slate-300'}`} />
            <span>Dominic Manoharan</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${managerName.toLowerCase().includes('dominic') || employeeId.toLowerCase().includes('dominic') ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>
              IT Operations Manager
            </span>
          </button>
        </div>
      </div>

      {/* Authenticated Manager Credentials Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Approving Manager Name
          </label>
          <input
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 font-mono focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="md:col-span-4">
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Manager Employee ID
          </label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 font-mono focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="md:col-span-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-center text-center">
            <UserCheck className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
            <div className="text-[11px] font-mono font-bold text-blue-900">
              <span className="block text-[9px] uppercase text-blue-600">Authenticated Manager</span>
              <span>{managerName} ({employeeId})</span>
            </div>
          </div>
        </div>
      </div>





      {/* TOP GATEWAY CLEARANCE ALERT BANNER FOR MANAGER DESK */}
      {gatewayBlockedTickets.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-rose-950 text-sm flex items-center gap-2">
                <span>🚨 SECURITY ALERT: {gatewayBlockedTickets.length} Ticket(s) Blocked at Gateway Clearance Checkpoint!</span>
              </h4>
              <p className="text-xs font-semibold text-rose-800 mt-0.5">
                CPU physical serial or ticket clearance was rejected at security gate. Approval Manager review and resolution tracker required.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('GATEWAY_BLOCKED')}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition-colors"
          >
            <span>View Rejected Gate Tickets ({gatewayBlockedTickets.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MASTER ASSET TRACKER TICKETS DESK & ADMIN PANEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Status Filter Tabs (Asset Tracker Board Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>All Movement Tickets Desk</span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                  Manager Admin Privileges Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                View, filter, edit, and update all movement tickets across the asset tracker system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>All Tickets</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {filteredTickets.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span>Pending Review</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingTickets.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span>Approved Passes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {approvedTickets.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-800 hover:bg-rose-50'
              }`}
            >
              <span>Rejected</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'REJECTED' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {rejectedTickets.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('GATEWAY_BLOCKED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'GATEWAY_BLOCKED'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : gatewayBlockedTickets.length > 0
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${gatewayBlockedTickets.length > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>Gateway Blocked</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'GATEWAY_BLOCKED' ? 'bg-rose-900 text-white' : 'bg-rose-200 text-rose-900 font-bold'}`}>
                {gatewayBlockedTickets.length}
              </span>
            </button>
          </div>
        </div>

        {displayedTickets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No Tickets Found in {statusFilter} Filter</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no CPU movement tickets matching your filter query. Raise new tickets from the IT Engineer Desk or switch filter to "All Tickets".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTickets.map((ticket) => {
              const isInlineEditing = editingTicket?.id === ticket.id;

              // Master asset match validation check
              const masterMatch = assets.find(
                a => a.serial_number.toUpperCase() === (ticket.asset_serial_number || '').toUpperCase() ||
                     a.barcode.toUpperCase() === (ticket.asset_barcode || '').toUpperCase()
              );

              if (isInlineEditing) {
                return (
                  <div
                    key={`edit-card-${ticket.id}`}
                    id={`ticket-card-${ticket.id}`}
                    className="bg-blue-50/40 border-2 border-blue-500 rounded-2xl p-5 shadow-lg space-y-4 relative transition-all"
                  >
                    {/* Asset Tracker Inline Edit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 pb-3">
                      <div className="flex items-center space-x-2">
                        <Edit3 className="w-5 h-5 text-blue-600" />
                        <h4 className="font-extrabold text-sm text-slate-900">
                          Asset Tracker Direct Inline Ticket Edit — #{editForm.ticket_no || ticket.ticket_no}
                        </h4>
                        <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                          Inline Mode
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTicket(null)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Form Controls */}
                    <form onSubmit={handleSaveTicketEdits} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Ticket Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.ticket_no}
                            onChange={(e) => setEditForm(prev => ({ ...prev, ticket_no: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Asset Type *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.asset_type}
                            onChange={(e) => setEditForm(prev => ({ ...prev, asset_type: e.target.value }))}
                            placeholder="CPU, Laptop, Monitor, Server..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Ticket Status *
                          </label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                          >
                            <option value="PENDING">PENDING (Awaiting Review)</option>
                            <option value="APPROVED">APPROVED (Clearance Issued)</option>
                            <option value="REJECTED">REJECTED (Security Hold)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            CPU Serial Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.asset_serial_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, asset_serial_number: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Barcode Tag *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.asset_barcode}
                            onChange={(e) => setEditForm(prev => ({ ...prev, asset_barcode: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Requestor Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.requestor_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, requestor_name: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Requestor Emp ID
                          </label>
                          <input
                            type="text"
                            value={editForm.requestor_emp_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, requestor_emp_id: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        <div className="sm:col-span-2 bg-white p-2.5 border border-slate-300 rounded-xl space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>IT Field Engineer Name *</span>
                            </span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={editForm.engineer_name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, engineer_name: e.target.value }))}
                              className="w-full pl-8 pr-9 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                            >
                              <option value="" disabled>Select Movement Engineer</option>
                              {SYSTEM_MOVEMENT_ENGINEERS.map((eng) => (
                                <option key={`m-eng-opt-${eng}`} value={eng} className="text-slate-900 font-bold">
                                  {eng}
                                </option>
                              ))}
                            </select>
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-2.5 pointer-events-none" />
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Engineer Emp ID
                          </label>
                          <input
                            type="text"
                            value={editForm.engineer_emp_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, engineer_emp_id: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                          />
                        </div>

                        {/* Route Config */}
                        <div className="sm:col-span-3 bg-white p-3 border border-slate-300 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Route Configuration (Origin ➜ Destination)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  origin_location: prev.destination_floor,
                                  destination_floor: prev.origin_location
                                }));
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                              <span>Swap Route</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                From Floor (Origin) *
                              </label>
                              <input
                                type="text"
                                required
                                value={editForm.origin_location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, origin_location: e.target.value }))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Destination Floor (To) *
                              </label>
                              <input
                                type="text"
                                required
                                value={editForm.destination_floor}
                                onChange={(e) => setEditForm(prev => ({ ...prev, destination_floor: e.target.value }))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 bg-white text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Target Room / Area
                          </label>
                          <input
                            type="text"
                            value={editForm.target_room}
                            onChange={(e) => setEditForm(prev => ({ ...prev, target_room: e.target.value }))}
                            placeholder="e.g. Bay-04 Workspace"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">
                            Deploy Port Number (Switch Port) *
                          </label>
                          <input
                            type="text"
                            value={editForm.port_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, port_number: e.target.value.toUpperCase() }))}
                            placeholder="e.g. SW03-P18"
                            className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-indigo-950 font-mono font-bold focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50"
                          />
                        </div>

                        {editForm.status === 'APPROVED' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Movement Identification (Ticket Number)
                            </label>
                            <input
                              type="text"
                              value={editForm.clearance_id}
                              onChange={(e) => setEditForm(prev => ({ ...prev, clearance_id: e.target.value }))}
                              placeholder="e.g. TKT-0001 (Ticket Number is official ID)"
                              className="w-full px-3 py-2 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800 bg-emerald-50 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        )}

                        {editForm.status === 'REJECTED' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Rejection Reason
                            </label>
                            <input
                              type="text"
                              value={editForm.rejection_reason}
                              onChange={(e) => setEditForm(prev => ({ ...prev, rejection_reason: e.target.value }))}
                              className="w-full px-3 py-2 border border-rose-300 rounded-lg text-slate-900 bg-rose-50 focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Movement Reason / Justification *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={editForm.reason}
                          onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      {/* Action buttons directly inside the ticket card */}
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-blue-200">
                        <button
                          type="button"
                          onClick={() => setEditingTicket(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saveLoading}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saveLoading ? 'Saving Ticket Changes...' : 'Save Ticket Changes'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              const isExpanded = expandedTicketId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  id={`ticket-card-${ticket.id}`}
                  className={`border rounded-2xl transition-all shadow-xs overflow-hidden ${
                    isExpanded 
                      ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'
                  }`}
                >
                  {/* Asset Tracker One-Click Summary Line (Row View) */}
                  <div
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/40 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      {/* Asset Tracker Ticket Key (Clickable 1-Click Detail Trigger) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTicketId(isExpanded ? null : ticket.id);
                        }}
                        className="font-mono text-xs font-black bg-slate-900 hover:bg-blue-600 text-white px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Click to expand full Asset Tracker ticket details"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>{ticket.ticket_no || `#TKT-${ticket.id}`}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-blue-300" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {/* Asset S/N & Type */}
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                        S/N: {ticket.asset_serial_number || ticket.asset_barcode}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded hidden sm:inline">
                        {ticket.asset_type || 'CPU'}
                      </span>

                      {/* Route Summary */}
                      <div className="flex items-center gap-1 text-xs font-mono text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200">
                        <span>{ticket.origin_location || 'IT_ROOM'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-bold text-blue-900">{ticket.destination_floor}</span>
                      </div>

                      {/* Requestor & Engineer */}
                      <div className="text-xs text-slate-600 font-medium hidden lg:flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{ticket.requestor_name}</span>
                        {ticket.engineer_name && (
                          <span className="text-slate-500 font-mono text-[11px]">(Eng: {ticket.engineer_name})</span>
                        )}
                      </div>

                      {/* Gateway Clearance Rejection Badge in Row View */}
                      {(ticket.gateway_clearance_status === 'BLOCKED' || ticket.gateway_clearance_status === 'DENIED' || ticket.gateway_clearance_status === 'HOLD' || Boolean(ticket.gateway_blocked_reason)) && (
                        <span className="text-[10px] font-mono font-black text-white bg-rose-600 border border-rose-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-300" />
                          <span>GATE REJECTED</span>
                        </span>
                      )}
                    </div>

                    {/* Right Controls: Status & Full Details Expand Toggle */}
                    <div className="flex items-center gap-2 shrink-0 justify-between md:justify-end" onClick={(e) => e.stopPropagation()}>
                      {/* Inline Editable Status Badge */}
                      <div className="relative inline-block">
                        <select
                          disabled={isReadOnly || actionLoading === ticket.id}
                          value={ticket.status}
                          onChange={(e) => handleQuickStatusChange(ticket, e.target.value as any)}
                          className={`pl-2.5 pr-6 py-1 text-xs font-black font-mono rounded-md border appearance-none cursor-pointer transition-all ${
                            ticket.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                              : ticket.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">✓ APPROVED</option>
                          <option value="REJECTED">✕ REJECTED</option>
                        </select>
                        <ChevronDown className="w-3 h-3 pointer-events-none absolute right-1.5 top-2 text-slate-700" />
                      </div>

                      {/* 1-Click Expand Full Ticket Details Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                        className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                        }`}
                      >
                        <span>{isExpanded ? 'Close Details' : 'Full Ticket Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Full Asset Tracker Ticket View (Opens Ticket-by-Ticket) */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-200 bg-white space-y-4">
                      {/* Sub-header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              <span>{ticket.ticket_no || `#TKT-${ticket.id}`}</span>
                            </span>
                            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                              S/N: {ticket.asset_serial_number || ticket.asset_barcode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono pt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Submitted: {new Date(ticket.created_at || Date.now()).toLocaleString()}</span>
                            <span className="text-emerald-700 font-bold ml-2">
                              In/Out ID: {ticket.ticket_no || ticket.clearance_id}
                            </span>
                          </p>
                        </div>

                        {/* Detailed Route View */}
                        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                          <div className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold">
                            <span className="block text-[9px] uppercase text-slate-400">From Source</span>
                            <span>{ticket.origin_location || 'IT_ROOM'}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg font-bold">
                            <span className="block text-[9px] uppercase text-emerald-600">To Floor</span>
                            <span>{ticket.destination_floor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Comprehensive Ticket Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Requestor Details</span>
                          <p className="font-bold text-slate-900">{ticket.requestor_name}</p>
                          <p className="font-mono text-[11px] text-slate-500">ID: {ticket.requestor_emp_id || 'REQ-8842'}</p>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">IT Field Engineer</span>
                          <p className="font-bold text-slate-900">{ticket.engineer_name || 'Alex Rivera'}</p>
                          <p className="font-mono text-[11px] text-slate-500">ID: {ticket.engineer_emp_id || '01099318'}</p>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Target Destination Room</span>
                          <p className="font-bold text-slate-900">{ticket.target_room || `Floor Workspace (${ticket.destination_floor})`}</p>
                          <p className="font-mono text-[11px] text-slate-500">Allocation Verified</p>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Inventory Master Stock</span>
                          <p className="font-bold text-slate-900">{masterMatch ? masterMatch.current_location : 'IT Stock Room'}</p>
                          <p className="font-mono text-[11px] text-emerald-700 font-bold">Status: {masterMatch?.status || 'AVAILABLE'}</p>
                        </div>
                      </div>

                      {/* Detailed Movement Reason Callout */}
                      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs">
                        <span className="block text-[10px] font-bold uppercase text-blue-700 mb-0.5">
                          Movement Request Justification & Reason:
                        </span>
                        <p className="text-slate-900 font-medium">{ticket.reason}</p>
                        {ticket.rejection_reason && (
                          <p className="text-rose-800 font-bold mt-1 text-[11px]">
                            Rejection Reason: {ticket.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* GATEWAY CLEARANCE TRACKER & REJECTION ALERT BOX */}
                      {(ticket.gateway_clearance_status === 'BLOCKED' || ticket.gateway_clearance_status === 'DENIED' || ticket.gateway_clearance_status === 'HOLD' || Boolean(ticket.gateway_blocked_reason)) && (
                        <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
                              <div>
                                <h4 className="font-extrabold text-rose-950 text-xs uppercase tracking-wide">
                                  🚨 Gateway Clearance Security Rejection Alert
                                </h4>
                                <p className="text-[11px] text-rose-700 font-medium">
                                  This CPU movement ticket was blocked at Security Gateway Clearance Checkpoint.
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-black text-rose-900 bg-rose-200 border border-rose-300 px-2.5 py-1 rounded-full uppercase">
                              GATEWAY: {ticket.gateway_clearance_status || 'BLOCKED'}
                            </span>
                          </div>

                          <div className="bg-white/90 p-3 rounded-lg border border-rose-200 text-xs space-y-1.5">
                            <p className="font-extrabold text-rose-950">
                              🛑 Gate Security Officer Rejection Verdict:
                            </p>
                            <p className="font-bold text-rose-900 bg-rose-50/80 p-2.5 rounded border border-rose-200 font-mono text-[11px]">
                              {ticket.gateway_blocked_reason || 'CPU failed gate clearance check (Serial number mismatch or unapproved ticket presented at checkpoint).'}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-700 font-medium">
                              <span>Scanned Gate Guard Officer: <strong>{ticket.gateway_scanned_by || 'Gate Security Officer-01'}</strong></span>
                              {ticket.scanned_physical_serial && (
                                <span className="font-mono font-bold bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-300">
                                  Physical Scanned S/N: {ticket.scanned_physical_serial}
                                </span>
                              )}
                              <span>Timestamp: {ticket.gateway_blocked_timestamp ? new Date(ticket.gateway_blocked_timestamp).toLocaleString() : 'Recently'}</span>
                            </div>
                          </div>

                          {!isReadOnly && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200">
                              <button
                                type="button"
                                onClick={() => handleOverrideGatewayBlock(ticket)}
                                disabled={actionLoading === ticket.id}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <ShieldCheck className="w-4 h-4 text-white" />
                                <span>Override & Resolve Gate Clearance Block</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(ticket)}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 text-blue-400" />
                                <span>Edit Ticket Details (Fix S/N or Route)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manager Approval Admin Rights Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isReadOnly ? 'Read-Only View' : 'Manager Admin Privileges Active — Full Read & Write'}</span>
                        </div>

                        {isReadOnly ? (
                          <div className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>Awaiting D. Manoharan Approval</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 flex-wrap">
                            {/* Asset Tracker Admin Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ticket)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                              title="Manager Write Access — Edit ticket parameters, serials, requestor, engineer or location"
                            >
                              <Edit3 className="w-4 h-4 text-white" />
                              <span>Edit Ticket (Admin)</span>
                            </button>

                            {ticket.status !== 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(ticket)}
                                disabled={actionLoading === ticket.id}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve & Issue Gate Pass</span>
                              </button>
                            )}

                            {ticket.status !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => setRejectingTicket(ticket)}
                                disabled={actionLoading === ticket.id}
                                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject Request</span>
                              </button>
                            )}

                            {ticket.status === 'APPROVED' && onNavigateToGateSecurity && (
                              <button
                                type="button"
                                onClick={() => onNavigateToGateSecurity(ticket.clearance_id || ticket.asset_serial_number || ticket.asset_barcode)}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                              >
                                <ScanBarcode className="w-4 h-4 text-emerald-600" />
                                <span>Gate Security Terminal ➔</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROCESSED TICKETS AUDIT LOG */}
      {processedTickets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm">
              Manager Approval Audit History ({processedTickets.length})
            </h3>
            <span className="text-xs font-mono text-gray-500">Immutable Audit Trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Ticket & Serial</th>
                  <th className="px-4 py-2.5">Requestor & Engineer</th>
                  <th className="px-4 py-2.5">Route & Destination</th>
                  <th className="px-4 py-2.5">Status & Clearance Pass</th>
                  <th className="px-4 py-2.5">Approving Manager</th>
                  <th className="px-4 py-2.5 text-center">Manager Write</th>
                  <th className="px-4 py-2.5 text-right">Processed Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {processedTickets.slice().reverse().map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        {t.ticket_no || `#TKT-${t.id}`}
                      </div>
                      <div className="font-mono text-[11px] text-blue-700 font-bold">
                        S/N: {t.asset_serial_number || t.asset_barcode}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{t.requestor_name}</div>
                      <div className="text-[10px] text-slate-500">Eng: {t.engineer_name || 'Alex Rivera'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Reason: {t.reason}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="font-bold text-slate-900">{t.origin_location} ➜ {t.destination_floor}</div>
                      <div className="text-[10px] text-slate-500">{t.target_room || `Room (${t.destination_floor})`}</div>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'APPROVED' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ APPROVED
                          </span>
                          <div className="text-[10px] font-mono text-emerald-700 font-bold">
                            Movement ID: {t.ticket_no}
                          </div>
                          {onNavigateToGateSecurity && (
                            <button
                              onClick={() => onNavigateToGateSecurity(t.clearance_id || t.asset_serial_number || t.asset_barcode)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            >
                              <ScanBarcode className="w-3 h-3 text-emerald-200" />
                              <span>Open Gate Terminal ➔</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                            ✕ REJECTED
                          </span>
                          <div className="text-[10px] text-rose-700 font-medium">
                            Reason: {t.rejection_reason || 'Policy hold'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.approved_by_name || managerName} ({t.approved_by_id || employeeId})
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(t)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer shadow-2xs"
                        title="Manager Write Access — Edit ticket details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-gray-400">
                      {t.approved_at ? new Date(t.approved_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatePresence>
        {rejectingTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200"
            >
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div className="flex items-center space-x-2 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                  <h4 className="font-bold text-sm">Mandatory Rejection Reason Required</h4>
                </div>
                <button
                  onClick={() => setRejectingTicket(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600">
                You are rejecting ticket <strong className="font-mono text-indigo-900">{rejectingTicket.ticket_no || `#TKT-${rejectingTicket.id}`}</strong> for CPU <strong className="font-mono">{rejectingTicket.asset_serial_number || rejectingTicket.asset_barcode}</strong>. Specify mandatory reason for security audit:
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter detailed reason for rejecting movement request..."
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTicket(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Confirm Rejection & Audit Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Hardware Barcode Scanner */}
      <AnimatePresence>
        {showScannerModal && (
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
                title="Module B — Approval Manager Hardware Barcode Reader"
                onSingleScan={(decoded) => {
                  setSearchQuery(decoded);
                  setShowScannerModal(false);
                }}
                onBulkScanSubmit={(scannedItems) => {
                  if (scannedItems.length > 0) {
                    setSearchQuery(scannedItems[0].serialNumber);
                  }
                  setShowScannerModal(false);
                }}
                onClose={() => setShowScannerModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IT Engineer Access Management Modal */}
      <AnimatePresence>
        {showEngineerManagerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">User Role Management & Security Desk</h3>
                    <p className="text-xs text-slate-500">
                      Create and assign system roles for IT Field Engineers and Platina Security officers.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowEngineerManagerModal(false);
                    setEngineerFeedback(null);
                    setShowAddEngineerForm(false);
                  }}
                  className="text-slate-400 hover:text-slate-800 font-bold text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {/* Alert Message Banner */}
              {engineerFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  engineerFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  <span>{engineerFeedback.message}</span>
                  <button onClick={() => setEngineerFeedback(null)} className="font-bold text-slate-500 hover:text-slate-900">✕</button>
                </div>
              )}

              {/* Top Toolbar Action */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Active System Users: {engineersList.length} Registered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchEngineers}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Reload user roster"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${engineerLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowAddEngineerForm(!showAddEngineerForm)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddEngineerForm ? 'Close Form' : 'Create User Role'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Add User Role Form */}
              {showAddEngineerForm && (
                <form onSubmit={handleCreateEngineer} className="bg-indigo-50/60 border border-indigo-200 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Assign New User Role & Permissions</span>
                    </h4>
                  </div>

                  {/* Role Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase">
                      Select User Role to Create *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setNewRoleType('module_a_engineer');
                          setNewEngDepartment('IT Field Services');
                          setNewEngEmpId(`010${Math.floor(100000 + Math.random() * 900000)}`);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          newRoleType === 'module_a_engineer'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                            : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>IT Field Engineer</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${newRoleType === 'module_a_engineer' ? 'bg-blue-800 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                            MODULE_A
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${newRoleType === 'module_a_engineer' ? 'text-blue-100' : 'text-slate-500'}`}>
                          Authorized to create movement requests and move equipment.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewRoleType('module_c_security');
                          setNewEngDepartment('Platina Corporate Security');
                          setNewEngEmpId(`SEC-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          newRoleType === 'module_c_security'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                            : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>Platina Security Officer</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${newRoleType === 'module_c_security' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                            MODULE_C
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 ${newRoleType === 'module_c_security' ? 'text-emerald-100' : 'text-slate-500'}`}>
                          Authorized for gate pass clearance and physical exit verification.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newEngName}
                        onChange={(e) => setNewEngName(e.target.value)}
                        placeholder="e.g. Samuel Kennedy"
                        className="w-full bg-white border border-slate-300 focus:border-indigo-600 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Office Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEngEmail}
                        onChange={(e) => setNewEngEmail(e.target.value)}
                        placeholder="e.g. user@247.ai"
                        className="w-full bg-white border border-slate-300 focus:border-indigo-600 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={newEngEmpId}
                        onChange={(e) => setNewEngEmpId(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-indigo-600 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Department / Facility
                      </label>
                      <input
                        type="text"
                        value={newEngDepartment}
                        onChange={(e) => setNewEngDepartment(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-indigo-600 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddEngineerForm(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingEngineer}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    >
                      {addingEngineer ? 'Registering User...' : 'Confirm & Assign Role'}
                    </button>
                  </div>
                </form>
              )}

              {/* Users Roster Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">User Name</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Emp ID</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Role Tier</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {engineersList.map((user) => {
                        const isSecurity = user.role_id === 'module_c_security' || user.department.toLowerCase().includes('security');
                        return (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                                isSecurity ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.name.charAt(0)}
                              </div>
                              <span>{user.name}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {user.email}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {user.emp_id}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {user.department || 'Platina Operations'}
                            </td>
                            <td className="py-2.5 px-3">
                              {isSecurity ? (
                                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                                  PLATINA_SECURITY
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-full">
                                  IT_ENGINEER
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleRevokeEngineerAccess(user.id, user.name)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px] flex items-center gap-1 ml-auto transition-all cursor-pointer"
                                title="Revoke user access role"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">
                  Configured roles have instant authorization across Movement Desk, Approval Desk, and Platina Security Gate.
                </span>
                <button
                  onClick={() => {
                    setShowEngineerManagerModal(false);
                    setEngineerFeedback(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated End-to-End Asset Tracking Report Modal (Zero Duplications) */}
      <AnimatePresence>
        {showAssetTrackingReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>End-to-End Asset Tracking Report</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                        ZERO DUPLICATIONS GUARANTEED
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Audit Trail: Who approved, which engineer moved, who asked the machine, destination floor, and switch port number.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportTrackingReportCSV}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV ({deduplicatedTrackingTickets.length})</span>
                  </button>

                  <button 
                    onClick={() => setShowAssetTrackingReportModal(false)}
                    className="text-slate-400 hover:text-slate-800 font-bold text-lg p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Unique Deployments</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{deduplicatedTrackingTickets.length}</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Gate Passes Approved</span>
                  <span className="text-xl font-bold font-mono text-emerald-900">
                    {deduplicatedTrackingTickets.filter(t => t.status === 'APPROVED' || t.clearance_id).length}
                  </span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">Network Switch Ports</span>
                  <span className="text-xl font-bold font-mono text-indigo-900">
                    {deduplicatedTrackingTickets.filter(t => t.port_number).length}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Duplicate Suppression</span>
                  <span className="text-xl font-bold font-mono text-purple-900">
                    {Math.max(0, tickets.length - deduplicatedTrackingTickets.length)} Filtered
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={assetTrackingSearch}
                    onChange={(e) => setAssetTrackingSearch(e.target.value)}
                    placeholder="Search by ticket, requestor, engineer, approver, serial number, floor, or port number..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Deduplicated Tracking Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grow flex flex-col">
                <div className="overflow-y-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Ticket ID</th>
                        <th className="py-2.5 px-3">Who Asked Machine (Requestor)</th>
                        <th className="py-2.5 px-3">Which Engineer Moved</th>
                        <th className="py-2.5 px-3">Who Approved</th>
                        <th className="py-2.5 px-3">Deployment Floor</th>
                        <th className="py-2.5 px-3">Port Number</th>
                        <th className="py-2.5 px-3">Machine Serial & Tag</th>
                        <th className="py-2.5 px-3 text-right">Status / Pass</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deduplicatedTrackingTickets
                        .filter(t => {
                          if (!assetTrackingSearch.trim()) return true;
                          const q = assetTrackingSearch.toLowerCase();
                          return (
                            (t.ticket_no || '').toLowerCase().includes(q) ||
                            (t.requestor_name || '').toLowerCase().includes(q) ||
                            (t.engineer_name || '').toLowerCase().includes(q) ||
                            (t.approved_by_name || '').toLowerCase().includes(q) ||
                            (t.asset_serial_number || '').toLowerCase().includes(q) ||
                            (t.destination_floor || '').toLowerCase().includes(q) ||
                            (t.port_number || '').toLowerCase().includes(q)
                          );
                        })
                        .map((t) => {
                          const approver = t.approved_by_name || (t.status === 'APPROVED' ? managerName : 'Pending Approval');
                          return (
                            <tr key={`track-${t.id}-${t.asset_serial_number}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {t.ticket_no || `#TKT-${t.id}`}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{t.requestor_name || 'N/A'}</div>
                                <div className="text-[10px] font-mono text-slate-500">{t.requestor_emp_id || 'Emp'}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-blue-900">{t.engineer_name || 'N/A'}</div>
                                <div className="text-[10px] font-mono text-slate-500">{t.engineer_emp_id || 'Eng ID'}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-indigo-900">{approver}</div>
                                <div className="text-[10px] font-mono text-indigo-600">
                                  {t.approved_by_id || (t.status === 'APPROVED' ? employeeId : 'N/A')}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-800">{t.destination_floor}</span>
                                <span className="block text-[10px] text-slate-500">{t.target_room || 'Bay Workspace'}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                {t.port_number ? (
                                  <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                                    {t.port_number}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">N/A</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                <div className="font-bold text-slate-800">{t.asset_serial_number}</div>
                                <div className="text-[10px] text-slate-500">{t.asset_barcode}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {t.status === 'APPROVED' ? (
                                  <div>
                                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                      APPROVED
                                    </span>
                                    {t.clearance_id && (
                                      <div className="text-[9px] font-mono text-emerald-800 font-bold mt-0.5">
                                        {t.clearance_id}
                                      </div>
                                    )}
                                  </div>
                                ) : t.status === 'REJECTED' ? (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                                    REJECTED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                                    PENDING
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  Verified end-to-end asset movement trail with switch port mapping and zero duplicate entries.
                </span>
                <button
                  onClick={() => setShowAssetTrackingReportModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close Report
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
