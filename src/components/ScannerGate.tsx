import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, MovementTicket, GateScanLog } from '../types';
import { ScanBarcode, ShieldAlert, ShieldCheck, QrCode, Download, Volume2, AlertTriangle, RefreshCw, XCircle, CheckCircle2, ArrowRightLeft, ArrowRight, Shield, Layers, Zap, Clock, RotateCw, Building2, User, FileSpreadsheet } from 'lucide-react';
import HardwareBarcodeScanner from './HardwareBarcodeScanner';
import BarcodeGraphic from './BarcodeGraphic';
import { validateAndCleanSerial } from '../utils/serialValidator';
import Papa from 'papaparse';

interface ScannerGateProps {
  assets: Asset[];
  tickets: MovementTicket[];
  scanLogs?: GateScanLog[];
  onRefresh: () => void;
  initialSelectedBarcode?: string;
}

export default function ScannerGate({ assets, tickets, scanLogs, onRefresh, initialSelectedBarcode }: ScannerGateProps) {
  // Terminal Mode: Standard Gateway Scan vs Backtrack Return to Stock Room
  const [terminalTab, setTerminalTab] = useState<'GATEWAY_SCAN' | 'BACKTRACK_RETURN'>('GATEWAY_SCAN');

  const [scannedInput, setScannedInput] = useState(initialSelectedBarcode || '');
  const [physicalCpuSerial, setPhysicalCpuSerial] = useState('');
  const [activeScanTarget, setActiveScanTarget] = useState<'TICKET' | 'PHYSICAL_CPU'>('PHYSICAL_CPU');

  const [guardName, setGuardName] = useState('Platina Security Officer');
  const [guardId, setGuardId] = useState('platina.security@247.ai');
  const [movementDirection, setMovementDirection] = useState<'OUTBOUND_EXIT' | 'INBOUND_ENTRY'>('OUTBOUND_EXIT');

  const [showHardwareScannerModal, setShowHardwareScannerModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clearance Outcome Alert State
  const [scanResult, setScanResult] = useState<'CLEARED' | 'HOLD' | 'DENIED' | 'REJECTED' | null>(null);
  const [resultDetails, setResultDetails] = useState<any>(null);
  const [gateLogs, setGateLogs] = useState<GateScanLog[]>([]);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [autoPastedTicketNotice, setAutoPastedTicketNotice] = useState<string | null>(null);

  // Backtrack Return to Stock Room Specific States
  const [backtrackSerial, setBacktrackSerial] = useState(initialSelectedBarcode || '');
  const [returnDisposition, setReturnDisposition] = useState<'BACK_TO_STOCK' | 'BACK_TO_SCRAP'>('BACK_TO_STOCK');
  const [returningEngineerName, setReturningEngineerName] = useState('Basavaraj SK');
  const [returningEngineerEmpId, setReturningEngineerEmpId] = useState('01099318');
  const [returnOriginFloor, setReturnOriginFloor] = useState('FLOOR_3');
  const [returnReason, setReturnReason] = useState('Hardware returned to stock room - Backtracked at gate security without ticket');
  const [isBacktracking, setIsBacktracking] = useState(false);
  const [backtrackSuccessData, setBacktrackSuccessData] = useState<any>(null);

  // Combined audit logs merging server scanLogs and local gateLogs
  const allLogs = useMemo(() => {
    const combined: GateScanLog[] = [...gateLogs];
    if (scanLogs && scanLogs.length > 0) {
      scanLogs.forEach(sLog => {
        if (!combined.some(c => c.id === sLog.id || (c.barcode === sLog.barcode && c.scanned_at === (sLog as any).scan_timestamp))) {
          combined.push({
            id: sLog.id,
            barcode: sLog.barcode,
            serial_number: (sLog as any).serial_number || sLog.barcode,
            ticket_id: (sLog as any).ticket_id,
            ticket_no: (sLog as any).ticket_no,
            scan_result: (sLog as any).is_valid === 1 ? 'CLEARED' : 'DENIED',
            scanned_by: sLog.scanned_by,
            scanned_at: (sLog as any).scan_timestamp || (sLog as any).scanned_at || new Date().toISOString(),
            from_location: sLog.from_location,
            to_location: sLog.to_location,
            reason: sLog.reason || '',
            clearance_id: (sLog as any).clearance_id,
            went_in_ticket_no: (sLog as any).went_in_ticket_no,
            went_in_date: (sLog as any).went_in_date,
            went_in_floor: (sLog as any).went_in_floor,
            went_in_port: (sLog as any).went_in_port,
            came_back_ticket_no: (sLog as any).came_back_ticket_no,
            came_back_date: (sLog as any).came_back_date,
            return_disposition: (sLog as any).return_disposition,
            is_backtracked_return: (sLog as any).is_backtracked_return
          });
        }
      });
    }
    return combined.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
  }, [gateLogs, scanLogs]);

  // Helper to search ticket by CPU serial number, engineer emp ID, clearance pass, or barcode and auto-paste into IT Room ticket input
  const autoSearchAndPasteTicket = (serialOrQuery: string) => {
    if (!serialOrQuery || serialOrQuery.trim().length < 2) return;
    const clean = serialOrQuery.trim().toUpperCase();
    const cleanNorm = clean.replace(/^(S\/N|CPU)-/i, '');

    const matchedTicket = tickets.find(t => {
      if (t.ticket_no && t.ticket_no.toUpperCase() === clean) return true;
      if ((t as any).clearance_id && (t as any).clearance_id.toUpperCase() === clean) return true;
      if (t.engineer_emp_id && t.engineer_emp_id.toUpperCase() === clean) return true;
      if (t.requestor_emp_id && t.requestor_emp_id.toUpperCase() === clean) return true;

      const serials = (t.asset_serial_number || '').toUpperCase().split(',').map(s => s.trim());
      if (serials.some(s => s === clean || s.replace(/^(S\/N|CPU)-/i, '') === cleanNorm)) return true;

      const barcodes = (t.asset_barcode || '').toUpperCase().split(',').map(s => s.trim());
      if (barcodes.some(b => b === clean || b.replace(/^(S\/N|CPU)-/i, '') === cleanNorm)) return true;

      return assets.some(a => 
        (a.serial_number.toUpperCase() === clean || a.barcode.toUpperCase() === clean) &&
        (serials.includes(a.serial_number.toUpperCase()) || barcodes.includes(a.barcode.toUpperCase()))
      );
    });

    if (matchedTicket && matchedTicket.ticket_no) {
      if (scannedInput !== matchedTicket.ticket_no && scannedInput !== matchedTicket.engineer_emp_id) {
        const isEngineerMatch = matchedTicket.engineer_emp_id && matchedTicket.engineer_emp_id.toUpperCase() === clean;
        const matchLabel = isEngineerMatch
          ? `Engineer Employee ID (${matchedTicket.engineer_emp_id} - ${matchedTicket.engineer_name || 'Engineer'})`
          : (matchedTicket as any).clearance_id && (matchedTicket as any).clearance_id.toUpperCase() === clean
          ? `Clearance Pass ID (${(matchedTicket as any).clearance_id})`
          : `Ticket (${matchedTicket.ticket_no})`;
        setAutoPastedTicketNotice(`✓ Matched via ${matchLabel} → Ticket ${matchedTicket.ticket_no} (${matchedTicket.status === 'APPROVED' ? 'Approved & Cleared for Movement' : `Status: ${matchedTicket.status}`})`);
      }
    }
  };

  // Real-Time Batch Duplicate Tracking
  const [scannedBatchSerials, setScannedBatchSerials] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    serialNumber: string;
    scannedAt: string;
    count: number;
    ticketNo?: string;
  } | null>(null);

  // Web Audio Synth Buffer Engine for Approval, Rejection, and Hold Alerts
  const playApprovalSoundBuffer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Approval Tri-Tone Major Buffer Chord (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {
      // Audio fallback
    }
  };

  const playRejectionSoundBuffer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Dissonant Double-Beep Warning Buffer (146.83 Hz D3 + 155.56 Hz Eb3)
      const now = ctx.currentTime;
      [0, 0.18, 0.36].forEach((delay) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(146.83, now + delay);
        osc2.frequency.setValueAtTime(155.56, now + delay);

        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + delay);
        osc2.start(now + delay);
        osc1.stop(now + delay + 0.15);
        osc2.stop(now + delay + 0.15);
      });
    } catch (e) {
      // Audio fallback
    }
  };

  const playHoldSoundBuffer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [440, 349.23].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.25);
      });
    } catch (e) {
      // Audio fallback
    }
  };

  const handleExecuteGateLookup = async (ticketOrSerialCode: string, physicalSerialCode?: string) => {
    let rawTicket = ticketOrSerialCode.trim();
    let rawPhysical = (physicalSerialCode !== undefined ? physicalSerialCode : physicalCpuSerial).trim();

    if (!rawTicket && !rawPhysical) return;

    // Validate inputs against serial number rule (no web URLs allowed)
    let cleanTicketInput = rawTicket;
    let cleanPhysicalSerial = rawPhysical;

    if (rawTicket) {
      const ticketVal = validateAndCleanSerial(rawTicket);
      if (!ticketVal.isValid) {
        playRejectionSoundBuffer();
        setScanResult('REJECTED');
        setResultDetails({
          scan_result: 'REJECTED',
          message: ticketVal.error || 'INVALID SCAN: Web URLs (HTTPS://...) are strictly prohibited. Only clean CPU Serial Numbers are allowed to scan.',
          scanned_physical_serial: rawTicket,
          expected_serial: 'ONLY SERIAL NUMBERS PERMITTED'
        });
        return;
      }
      cleanTicketInput = ticketVal.cleanSerial;
    }

    if (rawPhysical) {
      const physVal = validateAndCleanSerial(rawPhysical);
      if (!physVal.isValid) {
        playRejectionSoundBuffer();
        setScanResult('REJECTED');
        setResultDetails({
          scan_result: 'REJECTED',
          message: physVal.error || 'INVALID SCAN: Web URLs (HTTPS://...) are strictly prohibited. Only clean CPU Serial Numbers are allowed to scan.',
          scanned_physical_serial: rawPhysical,
          expected_serial: 'ONLY SERIAL NUMBERS PERMITTED'
        });
        return;
      }
      cleanPhysicalSerial = physVal.cleanSerial;
    }

    // Duplicate detection across active batch session
    const activeTargetSerial = cleanPhysicalSerial || cleanTicketInput;
    const normTarget = activeTargetSerial.replace(/^(S\/N|CPU)-/i, '');

    const existingOccurrences = scannedBatchSerials.filter(
      (s) => s.replace(/^(S\/N|CPU)-/i, '') === normTarget
    ).length;

    if (existingOccurrences > 0) {
      // Real-time duplicate warning trigger!
      playRejectionSoundBuffer();
      setDuplicateWarning({
        serialNumber: activeTargetSerial,
        scannedAt: new Date().toLocaleTimeString(),
        count: existingOccurrences + 1,
        ticketNo: cleanTicketInput !== activeTargetSerial ? cleanTicketInput : undefined
      });
    } else {
      setDuplicateWarning(null);
    }

    // Record serial into batch tracker
    setScannedBatchSerials((prev) => [...prev, activeTargetSerial]);

    setLoading(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/gate/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanned_input: cleanTicketInput || cleanPhysicalSerial,
          physical_cpu_serial: cleanPhysicalSerial || cleanTicketInput,
          guard_name: guardName,
          guard_id: guardId,
          movement_direction: movementDirection
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.scan_result) {
        setScanResult(data.scan_result);
        setResultDetails(data);

        if (data.scan_result === 'CLEARED') {
          playApprovalSoundBuffer();
          setShowDeclineModal(false);
        } else if (data.scan_result === 'HOLD') {
          playHoldSoundBuffer();
          setShowDeclineModal(true);
        } else {
          playRejectionSoundBuffer();
          setShowDeclineModal(true);
        }

        // Add to local gate log state
        const newLog: GateScanLog = {
          id: Date.now(),
          barcode: cleanPhysicalSerial || cleanTicketInput,
          serial_number: data.expected_serial || data.asset?.serial_number || cleanTicketInput,
          ticket_id: data.ticket?.id,
          ticket_no: data.ticket?.ticket_no,
          scan_result: data.scan_result,
          scanned_by: `${guardName} (${guardId})`,
          scanned_at: new Date().toISOString(),
          from_location: movementDirection === 'OUTBOUND_EXIT' ? (data.ticket?.origin_location || 'IT_ROOM') : 'GATE_TRANSIT',
          to_location: movementDirection === 'OUTBOUND_EXIT' ? 'GATE_TRANSIT' : (data.ticket?.destination_floor || 'FLOOR_WORKSPACE'),
          reason: data.message,
          clearance_id: data.clearance_id
        };

        setGateLogs(prev => [newLog, ...prev]);
        onRefresh();
      }
    } catch (err) {
      setLoading(false);
      alert('Failed to connect to Gate Clearance API.');
    }
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteGateLookup(scannedInput, physicalCpuSerial);
  };

  // Real-time lookup for the entered backtrack serial to find which ticket it went in
  const detectedBacktrackInfo = useMemo(() => {
    if (!backtrackSerial || backtrackSerial.trim().length < 2) return null;
    const clean = backtrackSerial.trim().toUpperCase();
    const cleanNorm = clean.replace(/^(S\/N|CPU)-/i, '');

    const matchedAsset = assets.find(a =>
      a.serial_number.toUpperCase() === clean ||
      a.barcode.toUpperCase() === clean ||
      a.serial_number.toUpperCase().replace(/^(S\/N|CPU)-/i, '') === cleanNorm ||
      a.barcode.toUpperCase().replace(/^(S\/N|CPU)-/i, '') === cleanNorm
    );

    // Find the most recent deployment ticket (where destination is not IT_ROOM)
    const matchedTicket = tickets.find(t => {
      if (t.movement_type === 'RETURN_TO_IT_ROOM' || t.destination_floor === 'IT_ROOM') return false;
      const serials = (t.asset_serial_number || '').toUpperCase().split(',').map(s => s.trim());
      const barcodes = (t.asset_barcode || '').toUpperCase().split(',').map(s => s.trim());
      return serials.some(s => s === clean || s.replace(/^(S\/N|CPU)-/i, '') === cleanNorm) ||
             barcodes.some(b => b === clean || b.replace(/^(S\/N|CPU)-/i, '') === cleanNorm) ||
             (matchedAsset && (serials.includes(matchedAsset.serial_number.toUpperCase()) || barcodes.includes(matchedAsset.barcode.toUpperCase())));
    });

    return {
      asset: matchedAsset,
      ticket: matchedTicket,
      went_in_ticket_no: matchedTicket?.ticket_no || (matchedAsset as any)?.last_floor_ticket_no || 'TKT-0002',
      went_in_date: matchedTicket?.approved_at || matchedTicket?.created_at || (matchedAsset as any)?.last_floor_entered_at || '2026-09-20 10:30',
      went_in_floor: matchedTicket?.destination_floor || (matchedAsset as any)?.last_floor || matchedAsset?.location || 'FLOOR_3',
      went_in_port: matchedTicket?.port_number || (matchedAsset as any)?.last_port_number || (matchedAsset as any)?.network_port || 'SW03-P24',
      went_in_requestor: matchedTicket?.requestor_name || 'Alice Chen',
      went_in_requestor_id: matchedTicket?.requestor_emp_id || '01099234',
      went_in_engineer: matchedTicket?.engineer_name || 'T Murugesh',
      went_in_approver: matchedTicket?.approved_by_name || 'Jyothi Potula'
    };
  }, [backtrackSerial, assets, tickets]);

  const handleAuthorizeBacktrackReturn = async () => {
    if (!backtrackSerial.trim()) {
      alert('Please enter or scan a CPU Serial Number or Barcode.');
      return;
    }

    const val = validateAndCleanSerial(backtrackSerial);
    if (!val.isValid) {
      playRejectionSoundBuffer();
      alert(val.error || 'Invalid serial number.');
      return;
    }

    setIsBacktracking(true);
    try {
      const res = await fetch('/api/gate/backtrack-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physical_cpu_serial: val.cleanSerial,
          guard_name: guardName,
          guard_id: guardId,
          return_disposition: returnDisposition,
          returning_engineer_name: returningEngineerName,
          returning_engineer_emp_id: returningEngineerEmpId,
          origin_floor: returnOriginFloor || detectedBacktrackInfo?.went_in_floor || 'FLOOR_3',
          reason: returnReason
        })
      });

      const data = await res.json();
      setIsBacktracking(false);

      if (data.success) {
        playApprovalSoundBuffer();
        setBacktrackSuccessData(data);

        // Add to local gateLogs
        const newLog: GateScanLog = {
          id: Date.now(),
          barcode: val.cleanSerial,
          serial_number: data.asset?.serial_number || val.cleanSerial,
          ticket_id: data.return_ticket?.id,
          ticket_no: data.came_back_ticket_no,
          scan_result: 'CLEARED',
          scanned_by: `${guardName} (${guardId})`,
          scanned_at: new Date().toISOString(),
          from_location: returnOriginFloor || detectedBacktrackInfo?.went_in_floor || 'FLOOR_3',
          to_location: returnDisposition === 'BACK_TO_SCRAP' ? 'IT_ROOM_SCRAP' : 'IT_ROOM_STOCK',
          reason: `CPU Backtracked Return: Went in [${data.went_in_ticket_no}] -> Returned under [${data.came_back_ticket_no}] (${data.return_disposition})`,
          clearance_id: data.clearance_id,
          went_in_ticket_no: data.went_in_ticket_no,
          went_in_date: data.went_in_date,
          went_in_floor: data.went_in_floor,
          went_in_port: data.went_in_port,
          came_back_ticket_no: data.came_back_ticket_no,
          came_back_date: data.came_back_date,
          return_disposition: data.return_disposition,
          is_backtracked_return: true
        };

        setGateLogs(prev => [newLog, ...prev]);
        onRefresh();
      } else {
        playRejectionSoundBuffer();
        alert(data.error || 'Failed to process backtrack return.');
      }
    } catch (e) {
      setIsBacktracking(false);
      alert('Error connecting to backtrack return API.');
    }
  };

  const handleExportGateScanCSV = () => {
    if (allLogs.length === 0) {
      alert('No scan log records captured yet to export.');
      return;
    }

    const exportData = allLogs.map(l => ({
      'Scan Timestamp': new Date(l.scanned_at).toLocaleString(),
      'Physical CPU Serial Number': l.serial_number || l.barcode,
      'Movement Ticket Number (In/Out Identification)': l.ticket_no || l.came_back_ticket_no || l.went_in_ticket_no || 'N/A',
      'Which Ticket Number It Went In': l.went_in_ticket_no || (l.to_location && l.to_location.includes('FLOOR') ? l.ticket_no : 'N/A'),
      'Went In Date': l.went_in_date ? new Date(l.went_in_date).toLocaleString() : 'N/A',
      'Went In Floor': l.went_in_floor || l.from_location,
      'Went In Port Number': l.went_in_port || 'N/A',
      'Which Ticket Number It Came Back': l.came_back_ticket_no || (l.to_location && l.to_location.includes('IT_ROOM') ? l.ticket_no : 'N/A'),
      'Came Back Date': l.came_back_date ? new Date(l.came_back_date).toLocaleString() : (l.to_location && l.to_location.includes('IT_ROOM') ? new Date(l.scanned_at).toLocaleString() : 'N/A'),
      'Return Disposition (Stock vs Scrap)': l.return_disposition || (l.to_location && l.to_location.includes('SCRAP') ? 'BACK_TO_SCRAP' : (l.to_location && l.to_location.includes('IT_ROOM') ? 'BACK_TO_STOCK' : 'N/A')),
      'Security Officer': l.scanned_by,
      'Scan Verdict': l.scan_result,
      'Gate Security Clearance Details': l.reason
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Gate_Security_Scan_Logs_With_Backtracking_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Module Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Gate Clearance Security Terminal</h2>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                GATE SECURITY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan barcode tags or serial numbers for inbound/outbound CPU gate clearance verification.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportGateScanCSV}
          disabled={allLogs.length === 0}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Gate Clearance Log Excel/CSV ({allLogs.length})</span>
        </button>
      </div>

      {/* Gate Clearance Shift Summary Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Total CPUs Cleared in Current Shift */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Shift CPUs Cleared</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {gateLogs.filter(l => l.scan_result === 'CLEARED').length}
              <span className="text-xs font-sans font-normal text-slate-500 ml-2">cleared</span>
            </div>
            <p className="text-[11px] text-slate-500">Gate clearances processed during shift</p>
          </div>
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-mono font-bold text-sm">
            ✓
          </div>
        </div>

        {/* Remaining Count Based on Pending Tickets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Tickets</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {tickets.filter(t => t.status === 'PENDING').length}
              <span className="text-xs font-sans font-normal text-slate-500 ml-2">pending</span>
            </div>
            <p className="text-[11px] text-slate-500">Awaiting clearance check at Gate-01</p>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-mono font-bold text-sm">
            ⏳
          </div>
        </div>

        {/* Shift Clearance Progress Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Shift Movement Progress</span>
              </div>
              <span className="font-mono text-slate-700">
                {tickets.length > 0
                  ? `${Math.round((gateLogs.filter(l => l.scan_result === 'CLEARED').length / (tickets.length || 1)) * 100)}%`
                  : '100%'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    tickets.length > 0
                      ? Math.round((gateLogs.filter(l => l.scan_result === 'CLEARED').length / tickets.length) * 100)
                      : 100
                  )}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 flex justify-between pt-0.5">
              <span>Security Guard: <strong className="text-slate-800">{guardName}</strong></span>
              <span>Total Tickets: <strong className="text-slate-800">{tickets.length}</strong></span>
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Duplicate Scan Warning Alert Notification */}
      {duplicateWarning && (
        <div className="bg-rose-950 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl animate-pulse flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-900 rounded-xl text-rose-300 border border-rose-600 shrink-0 shadow-lg">
              <ShieldAlert className="w-7 h-7 text-rose-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 text-slate-950 px-2 py-0.5 rounded font-mono">
                  🚨 REAL-TIME DUPLICATE SCAN WARNING
                </span>
                <span className="text-[10px] text-rose-300 font-mono">
                  Scan Occurrence #{duplicateWarning.count} • {duplicateWarning.scannedAt}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-white mt-1">
                Serial Number <span className="underline font-mono text-amber-300 bg-rose-900/80 px-1.5 py-0.5 rounded">{duplicateWarning.serialNumber}</span> Has Already Been Scanned In This Batch!
              </h4>
              <p className="text-xs text-rose-200 mt-1">
                This CPU serial number has been scanned <strong>{duplicateWarning.count} times</strong> during the current gate movement operation. Please inspect physical hardware tags to prevent duplicate processing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDuplicateWarning(null)}
            className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-600 shrink-0 shadow-md"
          >
            Dismiss Warning
          </button>
        </div>
      )}

      {/* Terminal Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setTerminalTab('GATEWAY_SCAN');
            setScanResult(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            terminalTab === 'GATEWAY_SCAN'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ScanBarcode className="w-4 h-4 text-blue-600" />
          <span>Standard Outbound / Inbound Ticket Gate Clearance</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTerminalTab('BACKTRACK_RETURN');
            setScanResult(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            terminalTab === 'BACKTRACK_RETURN'
              ? 'bg-blue-600 text-white shadow-md font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCw className="w-4 h-4 text-amber-300 animate-spin" />
          <span>🔄 CPU Returning to Stock Room (Backtrack Without Ticket Number)</span>
        </button>
      </div>

      {terminalTab === 'BACKTRACK_RETURN' ? (
        /* Dedicated Backtrack Return Terminal View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Backtrack Input & Disposition Configuration */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Stock Room Return Clearance & Backtracking</h3>
                    <p className="text-[11px] text-slate-500">Reverse-lookup previous outbound ticket and clear hardware</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  AUTO-LINK TICKETS
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Requirement Rule:</span>
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  When a CPU arrives at gate security returning to the stock room without an active ticket number, it is backtracked against its original deployment ticket. The security clearance records <strong>which ticket number it went in</strong> and <strong>which ticket number it came back</strong>, automatically syncing to the master Excel sheet.
                </p>
              </div>

              {/* S/N or Barcode Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Physical CPU Serial Number / Barcode Tag</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanTarget('PHYSICAL_CPU');
                      setShowHardwareScannerModal(true);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 border border-blue-200 px-2 py-0.5 rounded transition-all"
                  >
                    <ScanBarcode className="w-3.5 h-3.5" />
                    <span>Gun Scanner</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={backtrackSerial}
                    onChange={(e) => setBacktrackSerial(e.target.value)}
                    placeholder="Scan or enter S/N (e.g. S/N-L34D9W, S/N-H92G4K, S/N-DL77F5)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl font-mono text-sm font-bold text-slate-900 uppercase focus:outline-none shadow-xs transition-all"
                  />
                  {backtrackSerial && (
                    <button
                      type="button"
                      onClick={() => {
                        setBacktrackSerial('');
                        setBacktrackSuccessData(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Deployed CPUs Chips */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Quick Select Deployed CPUs on Floor:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {assets.filter(a => a.status === 'DEPLOYED_ON_FLOOR' || a.location?.includes('FLOOR')).slice(0, 5).map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setBacktrackSerial(a.serial_number);
                          if (a.last_floor) setReturnOriginFloor(a.last_floor);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                      >
                        {a.serial_number} ({a.location || 'Floor'})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Return Disposition Selection (Back to Stock vs Back to Scrap) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  Return Disposition (Destination Storage)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReturnDisposition('BACK_TO_STOCK')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      returnDisposition === 'BACK_TO_STOCK'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono">BACK TO STOCK</span>
                      {returnDisposition === 'BACK_TO_STOCK' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Tested / Operational CPU returned to active IT Stock Room inventory for re-deployment.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnDisposition('BACK_TO_SCRAP')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      returnDisposition === 'BACK_TO_SCRAP'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono">BACK TO SCRAP</span>
                      {returnDisposition === 'BACK_TO_SCRAP' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Defective or condemned CPU moved to Scrap Cage for decommissioning.
                    </p>
                  </button>
                </div>
              </div>

              {/* Engineer & Origin Floor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                    Returning Engineer
                  </label>
                  <select
                    value={returningEngineerName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setReturningEngineerName(name);
                      if (name === 'Basavaraj SK') setReturningEngineerEmpId('01099318');
                      else if (name === 'T Murugesh') setReturningEngineerEmpId('010125496');
                      else if (name === 'Vishal B') setReturningEngineerEmpId('01099234');
                      else if (name === 'Mahantesh') setReturningEngineerEmpId('01005651');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Basavaraj SK">Basavaraj SK (01099318)</option>
                    <option value="T Murugesh">T Murugesh (010125496)</option>
                    <option value="Vishal B">Vishal B (01099234)</option>
                    <option value="Mahantesh">Mahantesh (01005651)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">
                    Origin Floor Coming From
                  </label>
                  <select
                    value={returnOriginFloor}
                    onChange={(e) => setReturnOriginFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="FLOOR_1">FLOOR_1 (Operations Wing)</option>
                    <option value="FLOOR_2">FLOOR_2 (Finance & Analytics)</option>
                    <option value="FLOOR_3">FLOOR_3 (Engineering Pods)</option>
                    <option value="FLOOR_4">FLOOR_4 (Executive Suite)</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAuthorizeBacktrackReturn}
                disabled={isBacktracking || !backtrackSerial.trim()}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-100" />
                <span>
                  {isBacktracking
                    ? 'Recording Clearance & Updating Master Excel...'
                    : '🛡️ Authorize Gate Security Clearance & Record Stock Room Return'}
                </span>
              </button>
            </div>

            {/* Right Col: Backtrack Audit Comparison & Gate Clearance Pass */}
            <div className="lg:col-span-6 space-y-5">
              {/* Backtrack Comparison Card */}
              <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">Two-Way Movement Ticket Linkage Audit</h3>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                    GATE AUDIT VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {/* Box 1: Which Ticket Number It Went In */}
                  <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-blue-400">1. WHICH TICKET WENT IN</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-900 text-blue-200 border border-blue-600">OUTBOUND</span>
                    </div>
                    <div className="text-lg font-black text-amber-300">
                      {detectedBacktrackInfo?.went_in_ticket_no || 'TKT-0002'}
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-700/60 font-sans">
                      <p><strong>Origin:</strong> IT Stock Room</p>
                      <p><strong>Floor:</strong> {detectedBacktrackInfo?.went_in_floor || 'FLOOR_3'}</p>
                      <p><strong>Switch Port:</strong> {detectedBacktrackInfo?.went_in_port || 'SW03-P24'}</p>
                      <p><strong>Requestor:</strong> {detectedBacktrackInfo?.went_in_requestor || 'Alice Chen'}</p>
                      <p><strong>Outbound Eng:</strong> {detectedBacktrackInfo?.went_in_engineer || 'T Murugesh'}</p>
                      <p className="text-[10px] text-slate-400"><strong>Went In Date:</strong> {new Date(detectedBacktrackInfo?.went_in_date || '2026-09-20').toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Box 2: Which Ticket Number It Came Back */}
                  <div className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">2. WHICH TICKET CAME BACK</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900 text-emerald-200 border border-emerald-600">RETURN TKT</span>
                    </div>
                    <div className="text-lg font-black text-emerald-300">
                      {backtrackSuccessData?.came_back_ticket_no || 'RET-2026-0005 (Pending Clearance)'}
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-700/60 font-sans">
                      <p><strong>Destination:</strong> {returnDisposition === 'BACK_TO_SCRAP' ? 'IT Scrap Cage' : 'IT Stock Room'}</p>
                      <p><strong>Disposition:</strong> <span className={returnDisposition === 'BACK_TO_SCRAP' ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>{returnDisposition === 'BACK_TO_SCRAP' ? 'Back to Scrap' : 'Back to Stock'}</span></p>
                      <p><strong>Returning Eng:</strong> {returningEngineerName} ({returningEngineerEmpId})</p>
                      <p><strong>Security Officer:</strong> {guardName}</p>
                      <p className="text-[10px] text-slate-400"><strong>Came Back Date:</strong> {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Gate Security Clearance Barcode Pass Graphic */}
                <div className="bg-white rounded-xl p-3 text-slate-900 border border-slate-700 shadow-inner">
                  <BarcodeGraphic
                    value={backtrackSuccessData?.came_back_ticket_no || backtrackSuccessData?.clearance_id || 'RET-2026-STOCK'}
                    label="RETURN MOVEMENT IDENTIFICATION: TICKET NUMBER"
                    sublabel={`OFFICIAL RETURN TICKET: [${backtrackSuccessData?.came_back_ticket_no || 'RET-2026-AUTO'}] (ORIGIN WENT IN: [${detectedBacktrackInfo?.went_in_ticket_no || 'TKT-0002'}])`}
                    height={46}
                  />
                </div>
              </div>

              {/* Clearance Success Confirmation Card */}
              {backtrackSuccessData && (
                <div className="bg-[#042818] border-2 border-emerald-400 text-white rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-200 uppercase">
                        Gate Security Clearance Authorized & Recorded
                      </h4>
                      <p className="text-xs text-emerald-300 font-mono">
                        Movement Identification: Ticket Number <strong>{backtrackSuccessData.came_back_ticket_no}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-700 text-xs font-mono space-y-1 text-emerald-100">
                    <p>✓ Recorded: Went In Ticket <strong>{backtrackSuccessData.went_in_ticket_no}</strong></p>
                    <p>✓ Created: Came Back Ticket <strong>{backtrackSuccessData.came_back_ticket_no}</strong></p>
                    <p>✓ Asset Status updated to: <strong>{backtrackSuccessData.return_disposition}</strong> (Stock Room)</p>
                    <p>✓ Gate Security Clearance log saved & updated in Excel / CSV export sheet (No ticket tags created; Ticket Number is the identification).</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gate Scanner Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center space-x-2">
              <ScanBarcode className="w-4 h-4 text-teal-600 animate-pulse" />
              <span>Gateway Security Terminal Controller</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
              GATE-EXIT-01
            </span>
          </div>

          {/* Active Batch Session Tracker Bar */}
          <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Current Movement Session: <strong className="text-slate-900">{scannedBatchSerials.length}</strong> Scanned</span>
            </div>
            {scannedBatchSerials.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setScannedBatchSerials([]);
                  setDuplicateWarning(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
              >
                Reset Session
              </button>
            )}
          </div>

          {/* Movement Direction Selector (Outbound Floor Exit vs Inbound Floor Entry) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Movement Direction Checkpoint
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMovementDirection('OUTBOUND_EXIT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  movementDirection === 'OUTBOUND_EXIT'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                <span>Outbound (Leaving Floor)</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementDirection('INBOUND_ENTRY')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  movementDirection === 'INBOUND_ENTRY'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-teal-300" />
                <span>Inbound (Entering Floor)</span>
              </button>
            </div>
          </div>

          {/* Active Security Officer */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Guard Officer Name
              </label>
              <input
                type="text"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Guard Officer ID
              </label>
              <input
                type="text"
                value={guardId}
                onChange={(e) => setGuardId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Audio Buffer Test Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-blue-600" />
                Audio Buffer Synth Sound Test
              </span>
              <span className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                WEB AUDIO BUFFERS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={playApprovalSoundBuffer}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-xs"
              >
                <span>🔊 Test Approval Buffer Sound</span>
              </button>
              <button
                type="button"
                onClick={playRejectionSoundBuffer}
                className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-xs"
              >
                <span>🚨 Test Rejection Buffer Sound</span>
              </button>
            </div>
          </div>

          {/* Dual Barcode Scanner Controls Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ScanBarcode className="w-4 h-4 text-blue-600" />
                Hardware USB/Bluetooth Barcode Reader Terminal
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> HARDWARE HID ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              {/* Scan Field 1: Movement Ticket Number (In/Out Identification) */}
              <div id="gate-scan-field-engineer-clearance" className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-2.5 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shadow-xs">1</span>
                    <label htmlFor="gate-clearance-input" className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Movement Ticket Number (Asset In / Out Identification)
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      TICKET NUMBER AUTH
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveScanTarget('TICKET');
                        setShowHardwareScannerModal(true);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-all"
                    >
                      <ScanBarcode className="w-3 h-3" />
                      <span>Gun</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  <strong className="text-slate-700">Policy:</strong> No ticket tags are created. Only the <strong>Ticket Number</strong> is the identification for in and out of the asset. The engineer&apos;s <strong>Employee ID</strong> also validates authorization.
                </p>

                <div className="relative">
                  <input
                    id="gate-clearance-input"
                    type="text"
                    value={scannedInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScannedInput(val);
                      autoSearchAndPasteTicket(val);
                    }}
                    placeholder="e.g. Ticket Number (TKT-0001, RET-2026-0001) or Engineer Emp ID (01099318)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl font-mono text-xs font-bold text-slate-900 uppercase focus:outline-none shadow-xs transition-all"
                  />
                  {scannedInput && (
                    <button
                      type="button"
                      onClick={() => setScannedInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Selection Chips from approved/registered tickets for Engineer IDs */}
                {tickets.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Quick Tickets:</span>
                    {tickets.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const val = t.ticket_no || `TKT-${t.id}`;
                          setScannedInput(val);
                          autoSearchAndPasteTicket(val);
                        }}
                        className="text-[9px] font-mono font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 px-2 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs"
                      >
                        🎫 {t.ticket_no}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scan Field 2: Physical CPU Serial Number at Security Gate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[9px]">2</span>
                    Physical CPU Serial Number Scanned at Gate (Hardware Machine S/N)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScanTarget('PHYSICAL_CPU');
                      setShowHardwareScannerModal(true);
                    }}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ScanBarcode className="w-3 h-3" />
                    <span>Hardware Barcode Gun</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={physicalCpuSerial}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhysicalCpuSerial(val);
                    autoSearchAndPasteTicket(val);
                  }}
                  placeholder="Scan physical serial number on CPU (e.g. S/N-H92G4K)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl font-mono text-xs font-bold text-emerald-800 uppercase focus:outline-none shadow-2xs"
                />
              </div>

              {/* Auto-Pasted Ticket Indicator */}
              {autoPastedTicketNotice && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-between">
                  <span>{autoPastedTicketNotice}</span>
                  <button onClick={() => setAutoPastedTicketNotice(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-2">✕</button>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              onClick={() => handleExecuteGateLookup(scannedInput, physicalCpuSerial)}
              disabled={loading || (!scannedInput.trim() && !physicalCpuSerial.trim())}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Comparing Dual Serial Barcodes...</span>
                </>
              ) : (
                <>
                  <ScanBarcode className="w-4 h-4" />
                  <span>Verify Serial Match & Check Gateway Clearance</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Quick Demo Matching vs Mismatching Simulator */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Quick Test Scans (Click to Simulate Match / Mismatch):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={() => {
                  const approvedTicket = tickets.find(t => t.status === 'APPROVED') || tickets[0];
                  if (approvedTicket) {
                    const ticketNo = approvedTicket.ticket_no || `TKT-${approvedTicket.id}`;
                    const serialRaw = approvedTicket.asset_serial_number || 'S/N-H92G4K';
                    const serial = serialRaw.split(',')[0].trim();
                    setScannedInput(ticketNo);
                    setPhysicalCpuSerial(serial);
                    handleExecuteGateLookup(ticketNo, serial);
                  } else {
                    setScannedInput('TKT-0001');
                    setPhysicalCpuSerial('S/N-H92G4K');
                    handleExecuteGateLookup('TKT-0001', 'S/N-H92G4K');
                  }
                }}
                className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-xs"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                <span>🟢 Test Matching Serial (Green Light)</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={() => {
                  const approvedTicket = tickets.find(t => t.status === 'APPROVED') || tickets[0];
                  const ticketNo = approvedTicket ? (approvedTicket.ticket_no || `TKT-${approvedTicket.id}`) : 'TKT-0001';
                  setScannedInput(ticketNo);
                  setPhysicalCpuSerial('S/N-WRONG-9999');
                  handleExecuteGateLookup(ticketNo, 'S/N-WRONG-9999');
                }}
                className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-xs"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                <span>🔴 Test Mismatch Serial (Red Light)</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={() => {
                  const approvedTicket = tickets.find(t => t.status === 'APPROVED' && t.engineer_emp_id) || tickets.find(t => t.engineer_emp_id) || tickets[0];
                  if (approvedTicket) {
                    const empId = approvedTicket.engineer_emp_id || '01099318';
                    const serialRaw = approvedTicket.asset_serial_number || 'S/N-H92G4K';
                    const serial = serialRaw.split(',')[0].trim();
                    setScannedInput(empId);
                    setPhysicalCpuSerial(serial);
                    handleExecuteGateLookup(empId, serial);
                  }
                }}
                className="col-span-2 py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-xs"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span>👤 Test Engineer Emp ID as Clearance Pass (Any One Match)</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Gate Scan Result & Screen Display */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {/* Main Visual Screen Card */}
            {scanResult === 'CLEARED' && (
              <motion.div
                key="cleared"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-[#042818] border-4 border-emerald-400 text-white rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
              >
                {/* Background Signal Light Glow */}
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-emerald-500/40 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                        <CheckCircle2 className="w-9 h-9 text-slate-950" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-widest text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-600">
                          🟢 GREEN LIGHT — PERMITTED TO EXIT
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-wide text-white uppercase mt-1">
                        {movementDirection === 'OUTBOUND_EXIT' ? 'GATEWAY EXIT PERMITTED' : 'GATEWAY ENTRY PERMITTED'}
                      </h3>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-emerald-900/90 text-emerald-200 px-3.5 py-1.5 rounded-full border border-emerald-400">
                    SERIAL NUMBERS MATCHED ✓
                  </span>
                </div>

                {/* Serial Comparison Breakdown Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#063822] p-4 rounded-xl border border-emerald-500/50 font-mono text-xs">
                  <div className="bg-[#0a482c] p-3 rounded-lg border border-emerald-600/50">
                    <span className="text-emerald-300 text-[10px] uppercase block font-bold">1. IT Room Registered S/N</span>
                    <strong className="text-white text-sm block mt-0.5">{resultDetails?.expected_serial || 'S/N-VALID'}</strong>
                  </div>
                  <div className="bg-[#0a482c] p-3 rounded-lg border border-emerald-600/50">
                    <span className="text-emerald-300 text-[10px] uppercase block font-bold">2. Scanned Physical CPU S/N</span>
                    <strong className="text-emerald-300 text-sm block mt-0.5">{resultDetails?.scanned_physical_serial || 'S/N-VALID'}</strong>
                  </div>
                </div>

                {/* Barcode Graphic Render on Gate Pass */}
                <div className="bg-white rounded-xl p-3 text-slate-900 border border-emerald-300 shadow-inner">
                  <BarcodeGraphic
                    value={resultDetails?.ticket?.ticket_no || resultDetails?.clearance_id || scannedInput}
                    label="MOVEMENT IDENTIFICATION: TICKET NUMBER"
                    sublabel={`AUTHORIZED MOVEMENT IDENTIFICATION: ${resultDetails?.ticket?.ticket_no || 'TKT-VALID'}`}
                    height={48}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono bg-emerald-900/40 p-4 rounded-xl border border-emerald-500/30">
                  <div>
                    <span className="text-emerald-300 text-[10px] uppercase block">Ticket ID</span>
                    <strong className="text-white text-sm">{resultDetails?.ticket?.ticket_no || 'TKT-VALID'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-300 text-[10px] uppercase block">In / Out Identification</span>
                    <strong className="text-amber-300 text-sm font-black">{resultDetails?.ticket?.ticket_no || resultDetails?.clearance_id || 'TKT-VALID'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-300 text-[10px] uppercase block">Engineer (Bearer)</span>
                    <strong className="text-emerald-200 text-xs block font-bold truncate">
                      {resultDetails?.ticket?.engineer_name || 'Assigned Engineer'}
                    </strong>
                    <span className="text-amber-300 font-mono text-[11px] block">Emp ID: {resultDetails?.ticket?.engineer_emp_id || '01099318'}</span>
                  </div>
                  <div>
                    <span className="text-emerald-300 text-[10px] uppercase block">Destination Floor</span>
                    <strong className="text-white text-sm">{resultDetails?.ticket?.destination_floor}</strong>
                  </div>
                </div>

                <p className="text-xs font-bold text-emerald-100 bg-emerald-950/90 p-3 rounded-xl border border-emerald-500">
                  ✓ {resultDetails?.message}
                </p>
              </motion.div>
            )}

            {scanResult === 'HOLD' && (
              <motion.div
                key="hold"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-amber-500 text-slate-950 rounded-2xl p-6 shadow-2xl border-4 border-amber-300 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-amber-600/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-wider uppercase text-slate-950">🟡 AMBER HOLD — NOT YET APPROVED</h3>
                      <p className="text-xs font-bold text-slate-900 font-mono">DO NOT RELEASE CPU FROM IT ROOM</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-black bg-slate-950 text-amber-300 px-3 py-1 rounded-full">
                    HOLD AT GATEWAY
                  </span>
                </div>

                {/* Barcode Graphic Render for Hold */}
                <div className="bg-white rounded-xl p-3 text-slate-900 border border-amber-300">
                  <BarcodeGraphic
                    value={scannedInput}
                    label="ASSET MOVEMENT ON HOLD"
                    sublabel="AWAITING MANAGER APPROVAL BEFORE GATEWAY EXIT"
                    height={44}
                  />
                </div>

                <div className="p-4 bg-amber-600/50 rounded-xl border border-amber-700/60 text-xs font-mono font-bold text-slate-950 space-y-1">
                  <p>⚠️ Ticket status: PENDING MANAGER APPROVAL</p>
                  <p>Asset S/N must remain at IT Room until D. Manoharan authorizes the clearance pass.</p>
                </div>

                <p className="text-xs font-extrabold text-slate-950 bg-amber-200 p-3 rounded-xl">
                  {resultDetails?.message}
                </p>

                {/* Backtrack Return Shortcut if returning without ticket */}
                <div className="p-3 bg-amber-600/30 rounded-xl border border-amber-600 text-xs font-mono text-slate-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-950">
                    <RotateCw className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>Is this CPU returning to the Stock Room without a ticket number?</span>
                  </div>
                  <p className="text-[11px] text-slate-900">
                    You can backtrack this machine&apos;s previous deployment ticket and authorize gate clearance with an auto-linked return ticket.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminalTab('BACKTRACK_RETURN');
                      setBacktrackSerial(resultDetails?.scanned_physical_serial || scannedInput);
                    }}
                    className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <span>🔄 Switch to Backtrack Return Terminal for this CPU →</span>
                  </button>
                </div>
              </motion.div>
            )}

            {scanResult === 'DENIED' && (
              <motion.div
                key="denied"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-[#300508] border-4 border-rose-500 text-white rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden"
              >
                {/* Background Alarm Red Glow */}
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-rose-500/50 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 animate-pulse">
                        <ShieldAlert className="w-9 h-9" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-widest text-rose-300 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-600 animate-pulse">
                          🔴 RED LIGHT — NOT PERMITTED TO EXIT
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-wide text-rose-200 uppercase mt-1">
                        SECURITY ALERT: SERIAL MISMATCH DETECTED
                      </h3>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-rose-950 text-rose-300 px-3.5 py-1.5 rounded-full border border-rose-500">
                    NOT PERMITTED ✕
                  </span>
                </div>

                {/* Serial Comparison Mismatch Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#42090e] p-4 rounded-xl border border-rose-500 font-mono text-xs">
                  <div className="bg-[#570d13] p-3 rounded-lg border border-rose-600/60">
                    <span className="text-slate-300 text-[10px] uppercase block font-bold">1. IT Room Registered S/N</span>
                    <strong className="text-emerald-300 text-sm block mt-0.5">{resultDetails?.expected_serial || 'NOT REGISTERED'}</strong>
                  </div>
                  <div className="bg-[#570d13] p-3 rounded-lg border border-rose-500">
                    <span className="text-slate-300 text-[10px] uppercase block font-bold">2. Scanned Physical Gate CPU S/N</span>
                    <strong className="text-rose-300 text-sm block mt-0.5 underline font-black">{resultDetails?.scanned_physical_serial || scannedInput}</strong>
                  </div>
                </div>

                {/* Barcode Graphic Render for Denied */}
                <div className="bg-white rounded-xl p-3 text-slate-900 border border-rose-300 shadow-inner">
                  <BarcodeGraphic
                    value={resultDetails?.scanned_physical_serial || scannedInput}
                    label="UNAUTHORIZED / MISMATCHED BARCODE"
                    sublabel="GATEWAY CLEARANCE DENIED BY SECURITY POLICY"
                    height={44}
                  />
                </div>

                <div className="p-4 bg-rose-950/80 rounded-xl border border-rose-600 text-xs font-mono font-bold text-rose-100 space-y-1">
                  <p>🚫 RED LIGHT: CPU serial number does not match the IT Room clearance record.</p>
                  <p>Security guard must halt asset movement immediately and log incident.</p>
                </div>

                <p className="text-xs font-bold text-rose-100 bg-rose-900/90 p-3 rounded-xl border border-rose-600">
                  ❌ {resultDetails?.message}
                </p>

                {/* Backtrack Return Shortcut if returning without ticket */}
                <div className="p-3 bg-blue-950 border border-blue-500 rounded-xl text-xs font-mono text-white space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <RotateCw className="w-4 h-4 text-amber-400" />
                    <span>Returning CPU to Stock Room Without a Ticket?</span>
                  </div>
                  <p className="text-[11px] text-blue-200">
                    If this CPU is coming back to IT Room inventory, use Backtrack Return Clearance to link its original deployment ticket to a return ticket.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminalTab('BACKTRACK_RETURN');
                      setBacktrackSerial(resultDetails?.scanned_physical_serial || scannedInput);
                    }}
                    className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <span>🔄 Backtrack & Authorize Stock Room Return for this CPU →</span>
                  </button>
                </div>
              </motion.div>
            )}

            {!scanResult && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-3 shadow-sm"
              >
                <ScanBarcode className="w-12 h-12 text-blue-600/70 mx-auto animate-pulse" />
                <h4 className="text-base font-bold text-slate-900">Gateway Security Terminal Ready</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Launch the camera scanner or enter a CPU barcode/serial number on the left to verify exit/entry clearance.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      )}

      {/* Unified Full-Width Gate Clearance & Backtracking Audit Log Table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">
                Gate Security Clearance & Backtracking Audit Log ({allLogs.length})
              </h3>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                AUDIT VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking record of all CPU movements through gate clearance, including which ticket number it went in and which ticket number it came back.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportGateScanCSV}
            disabled={allLogs.length === 0}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Gate Security Excel/CSV ({allLogs.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3">Timestamp</th>
                <th className="px-3 py-3">CPU Serial Number</th>
                <th className="px-3 py-3 bg-blue-50/50 text-blue-800 border-x border-blue-100">Which Ticket It Went In</th>
                <th className="px-3 py-3 bg-purple-50/50 text-purple-800 border-r border-purple-100">Which Ticket It Came Back</th>
                <th className="px-3 py-3">Return Disposition</th>
                <th className="px-3 py-3">Clearance Verdict</th>
                <th className="px-3 py-3">Movement Ticket No (In/Out ID)</th>
                <th className="px-3 py-3">Security Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
              {allLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 font-sans">
                    No gate security clearance scans recorded yet.
                  </td>
                </tr>
              ) : (
                allLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-[10px] text-gray-500 font-sans whitespace-nowrap">
                      {new Date(l.scanned_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div>{l.serial_number || l.barcode}</div>
                    </td>
                    {/* Which Ticket It Went In */}
                    <td className="px-3 py-3 bg-blue-50/30 border-x border-blue-100 whitespace-nowrap">
                      {l.went_in_ticket_no ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            {l.went_in_ticket_no}
                          </span>
                          {l.went_in_floor && (
                            <div className="text-[10px] text-blue-700 font-sans">{l.went_in_floor}</div>
                          )}
                        </div>
                      ) : l.to_location && l.to_location.includes('FLOOR') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {l.ticket_no || 'TKT-VALID'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    {/* Which Ticket It Came Back */}
                    <td className="px-3 py-3 bg-purple-50/30 border-r border-purple-100 whitespace-nowrap">
                      {l.came_back_ticket_no ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            {l.came_back_ticket_no}
                          </span>
                          {l.came_back_date && (
                            <div className="text-[9px] text-purple-600 font-sans">
                              {new Date(l.came_back_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ) : l.to_location && l.to_location.includes('IT_ROOM') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {l.ticket_no || 'RET-TKT'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    {/* Return Disposition */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {l.return_disposition ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.return_disposition === 'BACK_TO_SCRAP'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {l.return_disposition === 'BACK_TO_SCRAP' ? 'SCRAP' : 'STOCK ROOM'}
                        </span>
                      ) : l.to_location && l.to_location.includes('SCRAP') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          SCRAP
                        </span>
                      ) : l.to_location && l.to_location.includes('IT_ROOM') ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          STOCK ROOM
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">OUTBOUND</span>
                      )}
                    </td>
                    {/* Verdict */}
                    <td className="px-3 py-3 font-bold whitespace-nowrap">
                      {l.scan_result === 'CLEARED' ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          ✓ CLEARED
                        </span>
                      ) : l.scan_result === 'HOLD' ? (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          ⏳ HOLD
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          ✕ DENIED
                        </span>
                      )}
                    </td>
                    {/* In/Out Movement Ticket Identification */}
                    <td className="px-3 py-3 text-indigo-700 font-bold whitespace-nowrap">
                      {l.ticket_no || l.came_back_ticket_no || l.went_in_ticket_no || l.clearance_id || 'N/A'}
                    </td>
                    {/* Security Officer */}
                    <td className="px-3 py-3 text-gray-600 font-sans text-xs whitespace-nowrap">
                      {l.scanned_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hardware Barcode Reader Modal */}
      <AnimatePresence>
        {showHardwareScannerModal && (
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
                title={`Module C — Gateway Security Hardware Reader (${activeScanTarget === 'TICKET' ? '1. IT Ticket S/N' : '2. Physical CPU Barcode'})`}
                onSingleScan={(decoded) => {
                  setShowHardwareScannerModal(false);
                  if (activeScanTarget === 'TICKET') {
                    setScannedInput(decoded);
                    handleExecuteGateLookup(decoded, physicalCpuSerial);
                  } else {
                    setPhysicalCpuSerial(decoded);
                    handleExecuteGateLookup(scannedInput, decoded);
                  }
                }}
                onBulkScanSubmit={(scannedItems) => {
                  setShowHardwareScannerModal(false);
                  if (scannedItems.length > 0) {
                    const lastItem = scannedItems[0];
                    if (activeScanTarget === 'TICKET') {
                      setScannedInput(lastItem.serialNumber);
                      handleExecuteGateLookup(lastItem.serialNumber, physicalCpuSerial);
                    } else {
                      setPhysicalCpuSerial(lastItem.serialNumber);
                      handleExecuteGateLookup(scannedInput, lastItem.serialNumber);
                    }
                  }
                }}
                onClose={() => setShowHardwareScannerModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GATE SECURITY DECLINE & REJECTION POP-UP MODAL */}
      <AnimatePresence>
        {showDeclineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, type: 'spring', bounce: 0.15 }}
              className="bg-[#1f0507] border-4 border-rose-500 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl space-y-5 my-auto relative overflow-hidden"
            >
              {/* Background Red Warning Glow */}
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header Alert */}
              <div className="flex items-center space-x-3.5 border-b border-rose-600/50 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/50 animate-bounce">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-600">
                    🔴 GATE SECURITY CLEARANCE DECLINED
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide mt-1">
                    CPU ENTRY / EXIT NOT PERMITTED
                  </h3>
                  <p className="text-xs text-rose-200">
                    The scanned CPU serial number is not authorized by IT Manager approval.
                  </p>
                </div>
              </div>

              {/* Crucial Banner Message */}
              <div className="p-4 bg-rose-950/90 border-2 border-rose-500 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-rose-300 font-extrabold text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Security Gate Blocking Policy Active</span>
                </div>
                <p className="text-xs font-bold text-white leading-relaxed">
                  {resultDetails?.message || `CPU Serial Number '${physicalCpuSerial || scannedInput}' DOES NOT exist in any registered IT Room movement ticket or is NOT APPROVED by IT Manager.`}
                </p>
              </div>

              {/* Details Table */}
              <div className="bg-[#2e090d] border border-rose-600/50 rounded-2xl p-4 font-mono text-xs space-y-2.5">
                <div className="flex justify-between items-center border-b border-rose-900/60 pb-2">
                  <span className="text-rose-300 text-[11px] font-bold uppercase">Scanned Physical CPU S/N:</span>
                  <span className="text-white font-black text-sm bg-rose-900/80 px-2 py-0.5 rounded border border-rose-600">
                    {resultDetails?.scanned_physical_serial || physicalCpuSerial || scannedInput || 'UNKNOWN'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-rose-900/60 pb-2">
                  <span className="text-rose-300 text-[11px] font-bold uppercase">Registered IT Room Ticket:</span>
                  <span className="text-amber-300 font-bold">
                    {resultDetails?.ticket?.ticket_no || 'NO MATCHING TICKET FOUND'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-rose-300 text-[11px] font-bold uppercase">IT Manager Approval Status:</span>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                    resultDetails?.ticket?.status === 'APPROVED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-rose-950 text-rose-300 border border-rose-600'
                  }`}>
                    {resultDetails?.ticket?.status ? resultDetails.ticket.status : 'UNAPPROVED / NOT FOUND'}
                  </span>
                </div>
              </div>

              {/* Instruction Warning */}
              <div className="bg-amber-950/80 border border-amber-600/60 p-3 rounded-xl text-amber-200 text-xs font-medium flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>GATEWAY ACTION REQUIRED:</strong> Do not allow this CPU to enter or exit the floor. Handover the asset back to IT Field Services or direct engineer to IT Manager D. Manoharan for ticket approval.
                </div>
              </div>

              {/* Dismiss Button */}
              <div className="pt-2 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setShowDeclineModal(false)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Acknowledge Gate Decline & Block CPU Entry</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

