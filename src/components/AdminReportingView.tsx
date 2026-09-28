import React, { useState, useMemo } from 'react';
import { Asset, MovementTicket, GateScanLog, Employee } from '../types';
import { Download, Database, Users, Layers, ShieldCheck, FileSpreadsheet, Plus, CheckCircle2, Search, Filter, Building2, User, AlertCircle, Check } from 'lucide-react';
import Papa from 'papaparse';

interface AdminReportingViewProps {
  assets: Asset[];
  tickets: MovementTicket[];
  scanLogs?: GateScanLog[];
  onRefresh: () => void;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Samuel Kennedy', employee_id: 'EMP-24701', role: 'Employee', department: 'Operations & Engineering', active: true },
  { id: 2, name: 'Alex Rivera', employee_id: 'ENG-8820', role: 'IT Engineer', department: 'IT Infrastructure', active: true },
  { id: 3, name: 'Jyothi Potula', employee_id: 'jyothi.potula', role: 'Approval Manager', department: 'IT Asset Governance Board', active: true },
  { id: 4, name: 'Dominic Manoharan', employee_id: 'dominic.manoharan@247.ai', role: 'Approval Manager', department: 'IT Operations', active: true },
  { id: 5, name: 'Platina Security Officer', employee_id: 'platina.security@247.ai', role: 'Gate Security', department: 'Platina Corporate Physical Security', active: true }
];

const INITIAL_FLOORS = [
  { id: 'F1', name: 'Floor 1', dept: 'Operations & Customer Support', capacity: 120 },
  { id: 'F2', name: 'Floor 2', dept: 'Software Engineering Lab', capacity: 150 },
  { id: 'F3', name: 'Floor 3', dept: 'Executive Suite & Finance', capacity: 80 },
  { id: 'F4', name: 'Floor 4', dept: 'Human Resources & Talent', capacity: 90 },
  { id: 'F5', name: 'Floor 5', dept: 'Product Design & Analytics', capacity: 110 },
  { id: 'F6', name: 'Floor 6', dept: 'Data Center & Network Operations', capacity: 60 },
  { id: 'F7', name: 'Floor 7', dept: '[24]7 Seventh Floor Asbuilt Office Layout', capacity: 200 },
  { id: 'F8', name: 'Floor 8', dept: 'Enterprise Sales & Business Dev', capacity: 100 },
  { id: 'F9', name: 'Floor 9', dept: 'Training & Development Center', capacity: 130 },
  { id: 'F12', name: 'Floor 12', dept: 'Executive Boardroom & C-Suite', capacity: 40 }
];

export default function AdminReportingView({ assets, tickets, scanLogs = [], onRefresh }: AdminReportingViewProps) {
  const [activeTab, setActiveTab] = useState<'TRACKING_REPORT' | 'MASTER_EXPORT' | 'FLOORS' | 'EMPLOYEES' | 'ASSETS'>('TRACKING_REPORT');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [trackingSearch, setTrackingSearch] = useState('');

  // Deduplicated End-to-End Asset Tracking Dataset (Eliminating any duplicates by Ticket/Serial/Barcode)
  const deduplicatedTrackingData = useMemo(() => {
    const seen = new Set<string>();
    const uniqueTickets: MovementTicket[] = [];

    for (const t of tickets) {
      // Create a unique composite key combining ticket_no (or id) and serial number
      const serialKey = (t.asset_serial_number || t.asset_barcode || '').trim().toUpperCase();
      const ticketKey = (t.ticket_no || `#TKT-${t.id}`).trim().toUpperCase();
      const compositeKey = `${ticketKey}:::${serialKey}`;

      if (!seen.has(compositeKey)) {
        seen.add(compositeKey);
        uniqueTickets.push(t);
      }
    }

    return uniqueTickets;
  }, [tickets]);

  const duplicateCount = tickets.length - deduplicatedTrackingData.length;

  const filteredTrackingData = useMemo(() => {
    if (!trackingSearch.trim()) return deduplicatedTrackingData;
    const q = trackingSearch.toLowerCase().trim();
    return deduplicatedTrackingData.filter(t => 
      (t.ticket_no && t.ticket_no.toLowerCase().includes(q)) ||
      (t.requestor_name && t.requestor_name.toLowerCase().includes(q)) ||
      (t.requestor_emp_id && t.requestor_emp_id.toLowerCase().includes(q)) ||
      (t.engineer_name && t.engineer_name.toLowerCase().includes(q)) ||
      (t.engineer_emp_id && t.engineer_emp_id.toLowerCase().includes(q)) ||
      (t.approved_by_name && t.approved_by_name.toLowerCase().includes(q)) ||
      (t.approved_by_id && t.approved_by_id.toLowerCase().includes(q)) ||
      (t.destination_floor && t.destination_floor.toLowerCase().includes(q)) ||
      (t.port_number && t.port_number.toLowerCase().includes(q)) ||
      (t.asset_serial_number && t.asset_serial_number.toLowerCase().includes(q)) ||
      (t.asset_barcode && t.asset_barcode.toLowerCase().includes(q)) ||
      (t.target_room && t.target_room.toLowerCase().includes(q))
    );
  }, [deduplicatedTrackingData, trackingSearch]);

  // New Employee Form
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [empRole, setEmpRole] = useState<'IT Engineer' | 'Approval Manager' | 'Gate Security' | 'Admin' | 'Employee'>('IT Engineer');
  const [empDept, setEmpDept] = useState('IT Support');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empId) return;

    const newEmp: Employee = {
      id: Date.now(),
      name: empName,
      employee_id: empId,
      role: empRole,
      department: empDept,
      active: true
    };
    setEmployees([...employees, newEmp]);
    setEmpName('');
    setEmpId('');
  };

  // Dedicated End-to-End Asset Tracking Report CSV Export (Zero Duplications)
  const handleExportTrackingReportCSV = () => {
    const exportRows = deduplicatedTrackingData.map((t, index) => {
      const matchedScan = scanLogs.find(s => s.ticket_no === t.ticket_no || s.barcode === t.asset_barcode);

      return {
        'SL No': index + 1,
        'Ticket ID': t.ticket_no || `#TKT-${t.id}`,
        'Who Asked Machine (Requestor)': t.requestor_name || 'N/A',
        'Requestor Employee ID': t.requestor_emp_id || 'N/A',
        'Which Engineer Moved': t.engineer_name || 'N/A',
        'Engineer Employee ID': t.engineer_emp_id || 'N/A',
        'Who Approved': t.approved_by_name || (t.status === 'APPROVED' ? 'Jyothi Potula' : 'Pending Approval'),
        'Approver Employee ID': t.approved_by_id || (t.status === 'APPROVED' ? 'jyothi.potula' : 'N/A'),
        'Gate Clearance Pass ID': t.clearance_id || (matchedScan?.clearance_id) || 'N/A',
        'Approval Status': t.status,
        'Origin Location': t.origin_location,
        'Deployment Floor': t.destination_floor,
        'Deployment Target Room': t.target_room || `Workspace Bay (${t.destination_floor})`,
        'Port Number (Switch Data Port)': t.port_number || 'N/A',
        'Machine Serial Number': t.asset_serial_number,
        'Machine Asset Tag / Barcode': t.asset_barcode,
        'Movement Reason': t.reason,
        'Which Ticket Number It Went In': t.went_in_ticket_no || matchedScan?.went_in_ticket_no || (t.destination_floor && t.destination_floor.includes('FLOOR') ? t.ticket_no : 'N/A'),
        'Went In Date': t.went_in_date ? new Date(t.went_in_date).toLocaleString() : (matchedScan?.went_in_date ? new Date(matchedScan.went_in_date).toLocaleString() : (t.destination_floor && t.destination_floor.includes('FLOOR') ? new Date(t.created_at).toLocaleString() : 'N/A')),
        'Went In Floor': t.went_in_floor || matchedScan?.went_in_floor || t.destination_floor || 'N/A',
        'Went In Port Number': t.went_in_port || matchedScan?.went_in_port || t.port_number || 'N/A',
        'Which Ticket Number It Came Back': t.came_back_ticket_no || matchedScan?.came_back_ticket_no || (t.destination_floor === 'IT_ROOM' ? t.ticket_no : 'N/A'),
        'Came Back Date': t.came_back_date ? new Date(t.came_back_date).toLocaleString() : (matchedScan?.came_back_date ? new Date(matchedScan.came_back_date).toLocaleString() : (t.destination_floor === 'IT_ROOM' ? new Date(t.created_at).toLocaleString() : 'N/A')),
        'Return Disposition (Stock vs Scrap)': t.return_disposition || matchedScan?.return_disposition || (t.destination_floor === 'IT_ROOM' ? 'BACK_TO_STOCK' : 'N/A'),
        'Physical Gate Scan Verified': matchedScan ? matchedScan.scan_result : (t.status === 'APPROVED' ? 'GATE_READY' : 'PENDING'),
        'Gate Security Guard': matchedScan ? matchedScan.scanned_by : 'Platina Security',
        'Movement Timestamp': t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'
      };
    });

    const csv = Papa.unparse(exportRows.length > 0 ? exportRows : [{ Message: 'No tracking records found' }]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `End_to_End_Asset_Tracking_Report_ZeroDuplicates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCombinedMasterCSVExport = () => {
    const exportRows = deduplicatedTrackingData.map(t => {
      const matchedScan = scanLogs.find(s => s.ticket_no === t.ticket_no || s.barcode === t.asset_barcode);

      return {
        'Ticket ID': t.ticket_no || `#TKT-${t.id}`,
        'Ticket Created At': new Date(t.created_at).toLocaleString(),
        'Who Asked Machine (Requestor)': t.requestor_name,
        'Requestor Employee ID': t.requestor_emp_id,
        'Which Engineer Moved': t.engineer_name,
        'Engineer Employee ID': t.engineer_emp_id,
        'Who Approved': t.approved_by_name || (t.status === 'APPROVED' ? 'Jyothi Potula' : 'N/A'),
        'Approving Manager ID': t.approved_by_id || (t.status === 'APPROVED' ? 'jyothi.potula' : 'N/A'),
        'Deployment Floor': t.destination_floor,
        'Deployment Target Room': t.target_room || 'N/A',
        'Port Number (Deploy Switch Port)': t.port_number || 'N/A',
        'Asset Type': t.asset_type || 'CPU',
        'Asset Serial Number': t.asset_serial_number,
        'Asset Barcode Tag': t.asset_barcode,
        'Source Location': t.origin_location,
        'Movement Reason': t.reason,
        'Manager Approval Status': t.status,
        'Gate Clearance Pass ID': t.clearance_id || (matchedScan?.clearance_id) || 'N/A',
        'Which Ticket Number It Went In': t.went_in_ticket_no || matchedScan?.went_in_ticket_no || (t.destination_floor && t.destination_floor.includes('FLOOR') ? t.ticket_no : 'N/A'),
        'Went In Date': t.went_in_date ? new Date(t.went_in_date).toLocaleString() : (matchedScan?.went_in_date ? new Date(matchedScan.went_in_date).toLocaleString() : 'N/A'),
        'Went In Floor': t.went_in_floor || matchedScan?.went_in_floor || (t.destination_floor && t.destination_floor.includes('FLOOR') ? t.destination_floor : 'N/A'),
        'Went In Port Number': t.went_in_port || matchedScan?.went_in_port || t.port_number || 'N/A',
        'Which Ticket Number It Came Back': t.came_back_ticket_no || matchedScan?.came_back_ticket_no || (t.destination_floor === 'IT_ROOM' ? t.ticket_no : 'N/A'),
        'Came Back Date': t.came_back_date ? new Date(t.came_back_date).toLocaleString() : (matchedScan?.came_back_date ? new Date(matchedScan.came_back_date).toLocaleString() : 'N/A'),
        'Return Disposition (Stock vs Scrap)': t.return_disposition || matchedScan?.return_disposition || (t.destination_floor === 'IT_ROOM' ? 'BACK_TO_STOCK' : 'N/A'),
        'Approval Decision Time': t.approved_at ? new Date(t.approved_at).toLocaleString() : 'N/A',
        'Rejection Reason': t.rejection_reason || 'N/A',
        'Gate Scan Result': matchedScan ? matchedScan.scan_result : 'NOT_SCANNED_AT_GATE',
        'Gate Security Guard': matchedScan ? matchedScan.scanned_by : 'Platina Security',
        'Gate Scan Time': matchedScan ? new Date(matchedScan.scanned_at).toLocaleString() : 'N/A'
      };
    });

    const csv = Papa.unparse(exportRows.length > 0 ? (exportRows as any[]) : [{ Message: 'No tickets present in master dataset' }]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_IT_Asset_Movement_Audit_With_Backtracking_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Module D — Admin Control & Master CSV Reporting Hub</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Master Data management (Floors, Employees, Assets) and merged Master Export reporting.
          </p>
        </div>

        <button
          onClick={handleCombinedMasterCSVExport}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Combined Master Export CSV (Tickets + Approvals + Gate Scans)</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('TRACKING_REPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'TRACKING_REPORT'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>End-to-End Asset Tracking Report ({deduplicatedTrackingData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MASTER_EXPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'MASTER_EXPORT'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>Master Audit Exports</span>
        </button>

        <button
          onClick={() => setActiveTab('FLOORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'FLOORS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Floors Master ({INITIAL_FLOORS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'EMPLOYEES'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Employees Master ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ASSETS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeTab === 'ASSETS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Database className="w-4 h-4 text-amber-400" />
          <span>Assets Master ({assets.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'TRACKING_REPORT' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  End-to-End Asset Movement & Deployment Tracking Report
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Zero Duplications Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete audit trail showing who approved, which engineer moved, who asked for the machine, destination floor, and switch port number.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportTrackingReportCSV}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-sm cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Deduplicated Report CSV ({deduplicatedTrackingData.length})</span>
              </button>
            </div>
          </div>

          {/* Audit Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
              <span className="block text-[10px] font-bold text-indigo-700 uppercase">Unique Asset Deployments</span>
              <p className="text-xl font-black text-indigo-950 mt-0.5">{deduplicatedTrackingData.length}</p>
              <p className="text-[10px] text-indigo-600 font-medium">Distinct verified records</p>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <span className="block text-[10px] font-bold text-emerald-700 uppercase">Approved Gate Passes</span>
              <p className="text-xl font-black text-emerald-950 mt-0.5">
                {deduplicatedTrackingData.filter(t => t.status === 'APPROVED').length}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">Approver validated & cleared</p>
            </div>

            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl">
              <span className="block text-[10px] font-bold text-blue-700 uppercase">Network Ports Allocated</span>
              <p className="text-xl font-black text-blue-950 mt-0.5">
                {new Set(deduplicatedTrackingData.map(t => t.port_number).filter(Boolean)).size}
              </p>
              <p className="text-[10px] text-blue-600 font-medium">Unique data switch ports</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Duplicate Records Suppressed</span>
              <p className="text-xl font-black text-slate-800 mt-0.5">{duplicateCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Duplication prevention active</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
              placeholder="Search by Requestor, Engineer, Approver, Destination Floor, Port Number, or Serial Number..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Deduplicated Table View */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Ticket #</th>
                  <th className="py-3 px-3">Who Asked Machine (Requestor)</th>
                  <th className="py-3 px-3">Which Engineer Moved</th>
                  <th className="py-3 px-3">Who Approved</th>
                  <th className="py-3 px-3">Deploy Floor & Room</th>
                  <th className="py-3 px-3">Port Number</th>
                  <th className="py-3 px-3">Machine Serial & Tag</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTrackingData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No asset tracking records matching your search query.
                    </td>
                  </tr>
                ) : (
                  filteredTrackingData.map((t) => (
                    <tr key={`track-${t.id}-${t.asset_serial_number}`} className="hover:bg-slate-50 transition-colors">
                      {/* Ticket # */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {t.ticket_no || `#TKT-${t.id}`}
                        </span>
                      </td>

                      {/* Who Asked Machine (Requestor) */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{t.requestor_name || 'N/A'}</div>
                        <div className="text-[10px] font-mono text-slate-500">ID: {t.requestor_emp_id || 'N/A'}</div>
                      </td>

                      {/* Which Engineer Moved */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-blue-950 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{t.engineer_name || 'N/A'}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">ID: {t.engineer_emp_id || 'N/A'}</div>
                      </td>

                      {/* Who Approved */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-emerald-950 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{t.approved_by_name || (t.status === 'APPROVED' ? 'Jyothi Potula' : 'Pending Review')}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {t.approved_by_id ? `ID: ${t.approved_by_id}` : (t.status === 'APPROVED' ? 'ID: jyothi.potula' : 'Awaiting Decision')}
                        </div>
                        {t.clearance_id && (
                          <span className="inline-block mt-0.5 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            Pass: {t.clearance_id}
                          </span>
                        )}
                      </td>

                      {/* Deploy Floor & Room */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{t.destination_floor}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{t.target_room || 'General Workstation'}</div>
                      </td>

                      {/* Port Number */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded text-xs shadow-2xs">
                          {t.port_number || 'SW-PORT-TBD'}
                        </span>
                      </td>

                      {/* Machine Serial & Tag */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{t.asset_serial_number}</div>
                        <div className="font-mono text-[10px] text-slate-500">Tag: {t.asset_barcode}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          t.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : t.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'MASTER_EXPORT' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Combined Master Audit Export Center</h3>
              <p className="text-xs text-gray-500">Merges Ticket Raising, Approval Manager Decisions, and Gate Security Clearance Scans by Ticket ID.</p>
            </div>
            <button
              onClick={handleCombinedMasterCSVExport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Combined Master CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">1. Tickets Module Export</span>
              <p className="text-xl font-black text-slate-900">{tickets.length} Tickets</p>
              <p className="text-xs text-slate-600">IT Field Engineer ticket records with serial numbers & destinations.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">2. Approvals Module Export</span>
              <p className="text-xl font-black text-emerald-700">{tickets.filter(t => t.status !== 'PENDING').length} Decided</p>
              <p className="text-xs text-slate-600">Manager decisions (Approvals, Clearance Passes, Rejection Reasons).</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">3. Gate Scan Logs Export</span>
              <p className="text-xl font-black text-teal-700">{scanLogs.length} Scans</p>
              <p className="text-xs text-slate-600">Security checkpoint exits (Allowed, Hold, Denied attempts).</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">4. CPU Backtracking Records</span>
              <p className="text-xl font-black text-purple-700">
                {scanLogs.filter(s => s.went_in_ticket_no || s.came_back_ticket_no || s.is_backtracked_return).length} Linked Returns
              </p>
              <p className="text-xs text-slate-600">Reverse-lookup audit linking which ticket it went in vs came back.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'FLOORS' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm">Master Floors Directory (Floor 1–9 and Floor 12)</h3>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
              {INITIAL_FLOORS.length} Master Floors
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {INITIAL_FLOORS.map(f => (
              <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 text-sm font-mono">{f.name}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    Cap: {f.capacity}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{f.dept}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'EMPLOYEES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Employee Form */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Staff / Employee Record</span>
            </h3>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="e.g. EMP-9982"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  System Role *
                </label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="IT Engineer">IT Engineer</option>
                  <option value="Approval Manager">Approval Manager</option>
                  <option value="Gate Security">Gate Security</option>
                  <option value="Employee">Employee (Requestor)</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer"
              >
                Add Employee to Master Data
              </button>
            </form>
          </div>

          {/* Employee Directory */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3">
              Master Employees Registry
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-gray-900">{emp.name}</td>
                      <td className="px-4 py-2.5 font-mono text-indigo-700 font-bold">{emp.employee_id}</td>
                      <td className="px-4 py-2.5 font-medium">{emp.role}</td>
                      <td className="px-4 py-2.5 text-gray-500">{emp.department}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ASSETS' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm">CPU & IT Assets Master Inventory</h3>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              {assets.length} Assets Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Barcode Tag</th>
                  <th className="px-4 py-3">Serial Number</th>
                  <th className="px-4 py-3">Asset Type</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Current Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {assets.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 font-mono">
                    <td className="px-4 py-2.5 font-bold text-indigo-700">{a.barcode}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{a.serial_number}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-sans">{a.asset_type || 'CPU'}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-sans">{a.model}</td>
                    <td className="px-4 py-2.5 font-bold text-teal-800">{a.current_location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
