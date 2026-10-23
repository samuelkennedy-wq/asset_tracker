import CompanyLogo from './CompanyLogo';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, MovementTicket } from '../types';
import TicketCommentsView from './TicketCommentsView';
import { 
  Plus, ScanBarcode, Download, CheckCircle2, Cpu, Zap, X, Trash2, FileText, 
  AlertTriangle, ShieldCheck, ArrowRightLeft, MapPin, Building2, User, UserCheck, 
  ChevronDown, Boxes, RotateCcw, Monitor, Mouse, Keyboard, Laptop, Printer, History,
  MessageSquare, ArrowLeft, Lock
} from 'lucide-react';
import { validateAndCleanSerial } from '../utils/serialValidator';
import Papa from 'papaparse';

interface MovementDeskProps {
  assets: Asset[];
  tickets: MovementTicket[];
  onRefresh: () => void;
}

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


function getNextItTicketNumber(existingTickets: MovementTicket[]): string {
  let highestNum = 12345;
  for (const t of (existingTickets || [])) {
    const tNo = (t.ticket_no || '').trim().toUpperCase();
    const match = tNo.match(/^IT([0-9]{6})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) {
        highestNum = num;
      }
    }
  }
  return 'IT' + (highestNum + 1).toString().padStart(6, '0');
}

export function renderStatusBadge(status: string) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>OPEN</span>
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>PENDING</span>
        </span>
      );
    case 'WAITING_FOR_REPORTER':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>WAITING FOR REPORTER</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>RESOLVED</span>
        </span>
      );
    case 'REOPENED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-orange-900 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
          <span>REOPENED</span>
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-teal-900 bg-teal-100 border border-teal-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
          <span>APPROVED</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          <span>REJECTED</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
          <span>{status}</span>
        </span>
      );
  }
}

export function getApprovalStatus(ticket: { approval_status?: string; status?: string; approved_at?: string; rejection_reason?: string }): 'APPROVED' | 'REJECTED' | 'PENDING' {
  if (ticket.approval_status === 'APPROVED' || ticket.status === 'APPROVED' || Boolean(ticket.approved_at && !ticket.rejection_reason)) {
    return 'APPROVED';
  }
  if (ticket.approval_status === 'REJECTED' || ticket.status === 'REJECTED' || Boolean(ticket.rejection_reason)) {
    return 'REJECTED';
  }
  return 'PENDING';
}

export function renderApprovalBadge(ticket: { approval_status?: string; status?: string; approved_at?: string; rejection_reason?: string }) {
  const appStatus = getApprovalStatus(ticket);
  switch (appStatus) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>APPROVED</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          <span>REJECTED</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>PENDING APPROVAL</span>
        </span>
      );
  }
}

export default function MovementDesk({ assets, tickets, onRefresh }: MovementDeskProps) {
  // Form State
  const [ticketNumber, setTicketNumber] = useState(() => getNextItTicketNumber(tickets));
  const [requestorName, setRequestorName] = useState('SAMUEL KENNEDY');
  const [requestorEmpId, setRequestorEmpId] = useState('EMP-01099234');
  const [engineerName, setEngineerName] = useState('Basavaraj');
  const [engineerEmpId, setEngineerEmpId] = useState('ENG-01088201');
  const [assetType, setAssetType] = useState<'CPU' | 'Mouse' | 'Monitor' | 'Keyboard' | 'Laptop' | 'Printer' | 'Server' | 'Other'>('CPU');
  
  // Movement Action Mode: Deploy to Floor (Outbound) vs Return to IT Room (Inbound)
  const [movementMode, setMovementMode] = useState<'DEPLOY_TO_FLOOR' | 'RETURN_TO_IT_ROOM'>('DEPLOY_TO_FLOOR');
  const [returnDisposition, setReturnDisposition] = useState<'BACK_TO_STOCK' | 'BACK_TO_SCRAP'>('BACK_TO_STOCK');

  // Locations
  const [sourceLocation, setSourceLocation] = useState('IT Room');
  const [destinationFloor, setDestinationFloor] = useState('Floor 3');
  const [targetRoom, setTargetRoom] = useState('');
  const [portNumber, setPortNumber] = useState('');
  const [reason, setReason] = useState<string>('New Deployment');

  // Floor Entry Historical Linkage State
  const [previousFloorTicketNo, setPreviousFloorTicketNo] = useState('');
  const [previousFloorEnteredAt, setPreviousFloorEnteredAt] = useState('');
  const [previousFloor, setPreviousFloor] = useState('');
  const [previousPortNumber, setPreviousPortNumber] = useState('');
  const [historicalInfo, setHistoricalInfo] = useState<{
    found: boolean;
    ticket_no?: string;
    entered_at?: string;
    floor?: string;
    port?: string;
    status?: string;
    return_disposition?: string;
    isStock?: boolean;
    isScrap?: boolean;
  } | null>(null);

  // Serial Numbers Scanned Queue (sn.1, sn.2, ...)
  const [scannedSerials, setScannedSerials] = useState<string[]>([]);
  const [currentSerialInput, setCurrentSerialInput] = useState('');
  const [bulkInputText, setBulkInputText] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Ticket for Ticket Comments Drawer
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const activeCommentTicket = selectedTicketId ? (tickets.find(t => t.id === selectedTicketId) || null) : null;

  // Status Filter for Ledger Table
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('ALL');
  const [transitioningStatus, setTransitioningStatus] = useState(false);

  const filteredTickets = useMemo(() => {
    if (tableStatusFilter === 'ALL') return tickets;
    return tickets.filter(t => t.status === tableStatusFilter);
  }, [tickets, tableStatusFilter]);

  const handleUpdateStatus = async (ticketId: number, nextStatus: string, note?: string) => {
    setTransitioningStatus(true);
    try {
      const res = await fetch(`/api/movement/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note: note || '',
          author_name: engineerName,
          role: 'IT Field Engineer'
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to update ticket status', e);
    } finally {
      setTransitioningStatus(false);
    }
  };

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode scanner input field on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Escape key listener to close full-page ticket view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTicketId !== null) {
        setSelectedTicketId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicketId]);

  // Play audio beep feedback for barcode scanner gun
  const playBeep = (freq = 900, duration = 100) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio fallback
    }
  };

  // Helper to fetch historical floor ticket data from server
  const fetchAssetHistory = async (serial: string) => {
    try {
      const res = await fetch(`/api/assets/history/${encodeURIComponent(serial.trim())}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch asset history:', err);
    }
    return null;
  };

  // Switch between Deploy to Floor and Return to IT Room
  const handleSwitchMode = (mode: 'DEPLOY_TO_FLOOR' | 'RETURN_TO_IT_ROOM') => {
    setMovementMode(mode);
    setError('');
    setSuccess('');
    if (mode === 'RETURN_TO_IT_ROOM') {
      setSourceLocation('Floor 3');
      setDestinationFloor('IT Room');
      setTargetRoom('IT Room Stock / Scrap Inventory');
      setReason('Defective Replacement');
    } else {
      setSourceLocation('IT Room');
      setDestinationFloor('Floor 3');
      setTargetRoom('');
      setReason('New Deployment');
    }
  };

  // Handle Return Disposition toggle
  const handleDispositionChange = (disp: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP') => {
    setReturnDisposition(disp);
  };

  // Process raw text or scanner gun input token by token
  const handleAddSerials = async (rawText: string) => {
    setError('');
    if (!rawText.trim()) return;

    const tokens = rawText.split(/[\n,;\t\s]+/).map(s => s.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    let addedCount = 0;
    const newQueue = [...scannedSerials];
    let lastErr = '';

    for (const token of tokens) {
      const valResult = validateAndCleanSerial(token);
      if (!valResult.isValid) {
        lastErr = valResult.error || `Invalid scan format for token "${token}"`;
        playBeep(350, 250);
        continue;
      }

      const clean = valResult.cleanSerial;

      // Duplicate check 1: Queue duplicate check
      if (newQueue.includes(clean)) {
        lastErr = `DUPLICATE REJECTED: ${assetType} Serial "${clean}" is already in queue (sn.${newQueue.indexOf(clean) + 1})!`;
        playBeep(400, 250);
        continue;
      }

      // Check active pending tickets
      const pendingTicket = tickets.find(
        t => (t.asset_serial_number?.toUpperCase().includes(clean) || t.asset_barcode?.toUpperCase().includes(clean)) &&
             t.status === 'PENDING'
      );
      if (pendingTicket) {
        lastErr = `ACTIVE TICKET PENDING: Serial "${clean}" is already registered under Ticket [${pendingTicket.ticket_no}], currently awaiting Approval Manager decision.`;
        playBeep(400, 250);
        continue;
      }

      // Fetch asset lifecycle history from server
      const histData = await fetchAssetHistory(clean);
      const isScrapped = histData?.asset?.status === 'BACK_TO_SCRAP' || 
                         histData?.asset?.return_disposition === 'BACK_TO_SCRAP' ||
                         histData?.latest_return?.disposition === 'BACK_TO_SCRAP';
      const isStocked = histData?.asset?.status === 'BACK_TO_STOCK' || 
                        histData?.asset?.return_disposition === 'BACK_TO_STOCK' ||
                        histData?.latest_return?.disposition === 'BACK_TO_STOCK' ||
                        histData?.asset?.current_location?.toUpperCase().includes('IT_ROOM') ||
                        histData?.asset?.current_location?.toUpperCase().includes('STOCK');

      if (movementMode === 'DEPLOY_TO_FLOOR') {
        // SCRAP PROTECTION: Scrapped items CANNOT be deployed to the floor
        if (isScrapped) {
          lastErr = `⚠️ SCRAP PROTECTION BLOCKED: Serial "${clean}" is marked as 'BACK TO SCRAP' (Decommissioned/Damaged). Scrapped hardware is permanently locked and cannot be deployed to any floor!`;
          playBeep(400, 350);
          continue;
        }

        // Check if currently deployed on a floor and NOT yet returned to stock
        const activeDeployedTicket = tickets.find(
          t => (t.asset_serial_number?.toUpperCase().includes(clean) || t.asset_barcode?.toUpperCase().includes(clean)) &&
               t.status === 'APPROVED' &&
               t.destination_floor &&
               !t.destination_floor.toUpperCase().includes('IT_ROOM') &&
               !t.destination_floor.toUpperCase().includes('STOCK') &&
               !t.destination_floor.toUpperCase().includes('SCRAP')
        );

        if (activeDeployedTicket && !isStocked) {
          lastErr = `ALREADY DEPLOYED: Machine "${clean}" is currently deployed on ${activeDeployedTicket.destination_floor} under Ticket [${activeDeployedTicket.ticket_no}]. To return it to the IT Room, switch mode to 'Return to IT Room'.`;
          playBeep(400, 250);
          continue;
        }

        if (isStocked) {
          const prevTkt = histData?.previous_floor_ticket?.ticket_no || histData?.asset?.last_floor_ticket_no || '';
          const prevFlr = histData?.previous_floor_ticket?.floor || histData?.asset?.last_floor || '';
          const prevPt = histData?.previous_floor_ticket?.port_number || histData?.asset?.last_port_number || '';
          setHistoricalInfo({
            found: true,
            ticket_no: prevTkt,
            entered_at: histData?.previous_floor_ticket?.entered_at || '',
            floor: prevFlr,
            port: prevPt,
            status: 'BACK_TO_STOCK',
            return_disposition: 'BACK_TO_STOCK',
            isStock: true
          });
          if (prevTkt) setPreviousFloorTicketNo(prevTkt);
        }
      } else {
        // RETURN_TO_IT_ROOM Mode
        // Auto-link historical ticket when this machine was entered into the floor
        if (histData && (histData.previous_floor_ticket || histData.asset)) {
          const prevTkt = histData.previous_floor_ticket?.ticket_no || histData.asset?.last_floor_ticket_no || '';
          const prevDate = histData.previous_floor_ticket?.entered_at || histData.asset?.last_floor_entered_at || '';
          const prevFlr = histData.previous_floor_ticket?.floor || histData.asset?.last_floor || sourceLocation;
          const prevPt = histData.previous_floor_ticket?.port_number || histData.asset?.last_port_number || '';

          setPreviousFloorTicketNo(prevTkt);
          setPreviousFloorEnteredAt(prevDate);
          setPreviousFloor(prevFlr);
          setPreviousPortNumber(prevPt);
          if (prevFlr && prevFlr !== 'IT Room') {
            setSourceLocation(prevFlr);
          }

          setHistoricalInfo({
            found: true,
            ticket_no: prevTkt,
            entered_at: prevDate,
            floor: prevFlr,
            port: prevPt,
            status: histData.asset?.status,
            return_disposition: returnDisposition,
            isScrap: returnDisposition === 'BACK_TO_SCRAP',
            isStock: returnDisposition === 'BACK_TO_STOCK'
          });
        }
      }

      newQueue.push(clean);
      addedCount++;
    }

    setScannedSerials(newQueue);
    setCurrentSerialInput('');
    setBulkInputText('');

    // Always refocus input for continuous 1-by-1 barcode scanning
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);

    if (addedCount > 0) {
      playBeep(1000, 120);
      setSuccess(`sn.${newQueue.length}: ${assetType} Serial "${newQueue[newQueue.length - 1]}" added successfully to ticket queue.`);
      setTimeout(() => setSuccess(''), 4000);
    } else if (lastErr) {
      setError(lastErr);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!ticketNumber.trim()) {
      setError('Ticket Number is required. Please enter a ticket number manually.');
      return;
    }

    if (!requestorName.trim()) {
      setError('Requestor Name is required.');
      return;
    }

    let finalQueue = [...scannedSerials];

    // If user has un-added text in current inputs, process it automatically
    if (currentSerialInput.trim()) {
      const val = validateAndCleanSerial(currentSerialInput.trim());
      if (val.isValid && !finalQueue.includes(val.cleanSerial)) {
        finalQueue.push(val.cleanSerial);
      }
    }
    if (bulkInputText.trim()) {
      const tokens = bulkInputText.split(/[\n,;\t\s]+/).map(s => s.trim()).filter(Boolean);
      for (const token of tokens) {
        const valResult = validateAndCleanSerial(token);
        if (valResult.isValid && !finalQueue.includes(valResult.cleanSerial)) {
          finalQueue.push(valResult.cleanSerial);
        }
      }
    }

    if (finalQueue.length === 0) {
      setError(`Please scan or enter at least one ${assetType} Serial Number (sn.1) for this ticket.`);
      return;
    }

    // Duplicate Port Check for Outbound Floor Deployment
    if (movementMode === 'DEPLOY_TO_FLOOR' && portNumber.trim()) {
      const cleanPort = portNumber.trim().toUpperCase();
      const dupPortTicket = tickets.find(
        t => t.destination_floor?.toUpperCase() === destinationFloor.toUpperCase() &&
             t.port_number?.toUpperCase() === cleanPort &&
             (t.status === 'PENDING' || t.status === 'APPROVED')
      );
      if (dupPortTicket) {
        setError(`DUPLICATE PORT REJECTED: Network Port "${cleanPort}" on ${destinationFloor} is already allocated under active Ticket [${dupPortTicket.ticket_no}]. Duplicate deployment ports are strictly blocked.`);
        playBeep(400, 300);
        return;
      }
    }

    const typePrefix = assetType.slice(0, 3).toUpperCase();

    setLoading(true);
    try {
      const res = await fetch('/api/movement/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_no: ticketNumber.trim().toUpperCase(),
          requestor_name: requestorName.trim().toUpperCase(),
          requestor_emp_id: requestorEmpId.trim().toUpperCase(),
          engineer_name: engineerName.trim().toUpperCase(),
          engineer_emp_id: engineerEmpId.trim().toUpperCase(),
          asset_type: assetType,
          serial_numbers: finalQueue,
          serial_number: finalQueue.join(', '),
          barcodes: finalQueue.map(sn => sn.startsWith(typePrefix) ? sn : `${typePrefix}-${sn}`),
          barcode: finalQueue.map(sn => sn.startsWith(typePrefix) ? sn : `${typePrefix}-${sn}`).join(', '),
          origin_location: sourceLocation,
          destination_floor: destinationFloor,
          target_room: targetRoom.trim() || (movementMode === 'RETURN_TO_IT_ROOM' ? 'IT Room Stock / Scrap Cage' : `Floor Workspace (${destinationFloor})`),
          port_number: movementMode === 'RETURN_TO_IT_ROOM' ? (previousPortNumber || 'N/A (Return)') : portNumber.trim().toUpperCase(),
          reason: reason,
          movement_type: movementMode,
          return_disposition: movementMode === 'RETURN_TO_IT_ROOM' ? returnDisposition : undefined,
          previous_floor_ticket_no: previousFloorTicketNo || undefined,
          previous_floor_entered_at: previousFloorEnteredAt || undefined,
          previous_floor: previousFloor || undefined,
          previous_port_number: previousPortNumber || undefined
        })
      });

      if (res.ok) {
        const actionLabel = movementMode === 'RETURN_TO_IT_ROOM' 
          ? `Returned to IT Room (${returnDisposition === 'BACK_TO_SCRAP' ? 'BACK TO SCRAP' : 'BACK TO STOCK'})` 
          : 'Deployment to Floor Raised';
        setSuccess(`Ticket [${ticketNumber.trim().toUpperCase()}] created successfully: ${actionLabel} for ${finalQueue.length} ${assetType}(s)!`);
        setScannedSerials([]);
        setCurrentSerialInput('');
        setBulkInputText('');
        setTimeout(() => setSuccess(''), 6000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to create movement ticket.');
      }
    } catch {
      setError('Failed to create movement ticket.');
    } finally {
      setLoading(false);
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    const exportData = tickets.map(t => ({
      'Ticket Number': t.ticket_no || `#TKT-${t.id}`,
      'Requestor Name': t.requestor_name,
      'IT Engineer Name': t.engineer_name,
      'Asset Type': t.asset_type,
      'Asset Serial Number': t.asset_serial_number,
      'Asset Barcode': t.asset_barcode,
      'Source Location': t.origin_location,
      'Destination Floor': t.destination_floor,
      'Target Room / Desk': t.target_room || 'N/A',
      'Port Number': t.port_number || 'N/A',
      'Reason': t.reason,
      'Status': t.status,
      'Movement In/Out Identification': t.ticket_no || t.clearance_id || 'N/A',
      'Created At': new Date(t.created_at).toLocaleString()
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IT_Engineer_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Module Banner */}
      

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ticket Raising Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Raise Movement Ticket</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
              MANUAL TICKET NUMBER
            </span>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">

            {/* Movement Action Mode Toggle: Deploy to Floor (Outbound) vs Return to IT Room (Inbound) */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchMode('DEPLOY_TO_FLOOR')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  movementMode === 'DEPLOY_TO_FLOOR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <div className="text-left leading-tight">
                  <div>Deploy to Floor</div>
                  <div className="text-[10px] font-normal opacity-85">IT Room / Stock ➔ Workstation Floor</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('RETURN_TO_IT_ROOM')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  movementMode === 'RETURN_TO_IT_ROOM'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <div className="text-left leading-tight">
                  <div>Return to IT Room</div>
                  <div className="text-[10px] font-normal opacity-85">Workstation Floor ➔ IT Room</div>
                </div>
              </button>
            </div>

            {/* Inbound Return Disposition Selector (Back to Stock vs Back to Scrap) */}
            {movementMode === 'RETURN_TO_IT_ROOM' && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-700" />
                    <span>Return Disposition (Enter Data when Machine is Back) *</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    returnDisposition === 'BACK_TO_SCRAP' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {returnDisposition === 'BACK_TO_SCRAP' ? '🗑️ TO SCRAP' : '📦 TO STOCK'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div
                    className="py-2.5 px-3 rounded-lg border border-emerald-600 bg-emerald-600 text-white shadow-2xs text-left text-xs font-bold flex items-center gap-2"
                  >
                    <Boxes className="w-4 h-4 shrink-0" />
                    <div>
                      <div>Back to Stock</div>
                      <div className="text-[10px] font-normal opacity-85">Tested / Reusable Inventory</div>
                    </div>
                  </div>
                </div>

                {/* Historical Floor Deployment Linkage Fields */}
                <div className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-amber-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      <span>Data where ticket entered inside floor</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Auto-retrieved on scan or enter manually</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Floor Entry Ticket #</label>
                      <input
                        type="text"
                        value={previousFloorTicketNo}
                        onChange={(e) => setPreviousFloorTicketNo(e.target.value.toUpperCase())}
                        placeholder="e.g. IT012346"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 bg-amber-50/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Entered Floor Date</label>
                      <input
                        type="text"
                        value={previousFloorEnteredAt ? new Date(previousFloorEnteredAt).toLocaleDateString() : ''}
                        onChange={(e) => setPreviousFloorEnteredAt(e.target.value)}
                        placeholder="Auto-linked"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono text-slate-700 bg-amber-50/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Origin Floor</label>
                      <input
                        type="text"
                        value={previousFloor || sourceLocation}
                        onChange={(e) => {
                          setPreviousFloor(e.target.value);
                          setSourceLocation(e.target.value);
                        }}
                        placeholder="e.g. Floor 3"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-900 bg-amber-50/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Original Port Number</label>
                      <input
                        type="text"
                        value={previousPortNumber}
                        onChange={(e) => setPreviousPortNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. SW03-P18"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold text-indigo-900 bg-amber-50/40 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Re-deploying Returned Stock Verification Card in Outbound Mode */}
            {movementMode === 'DEPLOY_TO_FLOOR' && historicalInfo?.isStock && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Returned Stock Re-Deployment Authorized</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-mono">
                  Asset in stock inventory is approved to come back to the floor. Previous Floor Entry Ticket: <strong className="text-emerald-950">{historicalInfo.ticket_no || 'TKT-0001'}</strong> ({historicalInfo.floor || 'Floor 3'}).
                </p>
              </div>
            )}

            {/* Ticket Number, Requestor Name & Requestor Emp ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ticket Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                    placeholder="E.G. IT012346"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white uppercase"
                  />
                  <FileText className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Requestor Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value.toUpperCase())}
                  placeholder="REQUESTOR FULL NAME"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Requestor Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={requestorEmpId}
                  onChange={(e) => setRequestorEmpId(e.target.value.toUpperCase())}
                  placeholder="E.G. EMP-01099234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white uppercase"
                />
              </div>
            </div>

            {/* System Movement Engineer Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Movement Engineer Details *</span>
                </label>
                <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                  Selected: {engineerName || 'None'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Movement Engineer Name *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={engineerName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setEngineerName(name);
                        const empIds: Record<string, string> = {
                          'Basavaraj': 'ENG-01088201',
                          'Murugesh': 'ENG-01088202',
                          'Vishal': 'ENG-01088203',
                          'Mahantesh': 'ENG-01088204'
                        };
                        if (empIds[name]) {
                          setEngineerEmpId(empIds[name]);
                        }
                      }}
                      className={`w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer shadow-xs ${
                        engineerName ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      <option value="" disabled>Select Movement Engineer</option>
                      {SYSTEM_MOVEMENT_ENGINEERS.map((eng) => (
                        <option key={eng} value={eng} className="text-slate-900 font-bold">
                          {eng}
                        </option>
                      ))}
                    </select>
                    <UserCheck className="w-4 h-4 text-blue-600 absolute left-2.5 top-2.5 pointer-events-none" />
                    <ChevronDown className="w-4 h-4 text-slate-600 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Movement Engineer Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={engineerEmpId}
                    onChange={(e) => setEngineerEmpId(e.target.value.toUpperCase())}
                    placeholder="E.G. ENG-01088201"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Hardware Barcode Scanner Terminal Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-blue-600" />
                  <span>Hardware Barcode Scanner Terminal</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>BARCODE GUN READY</span>
                </div>
              </div>

              {/* Hardware Barcode Gun Input Field (Continuous Scanning on Enter or Tab) */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={currentSerialInput}
                    onChange={(e) => setCurrentSerialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSerials(currentSerialInput);
                      }
                    }}
                    placeholder={`Point Barcode Scanner Gun here to scan CPU sn.${scannedSerials.length + 1}...`}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSerials(currentSerialInput)}
                    disabled={!currentSerialInput.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs shrink-0 flex items-center space-x-1"
                  >
                    <span>+ Add CPU (sn.{scannedSerials.length + 1})</span>
                  </button>
                </div>
              </div>

              {/* Scanned Serial Numbers List: Entered One After Another in Neat Column */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scanned Serial Column Ledger [{ticketNumber}]</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded-full">
                      {scannedSerials.length} Scanned
                    </span>
                  </span>
                  {scannedSerials.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedSerials([])}
                      className="text-rose-600 hover:underline text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {scannedSerials.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-mono italic bg-slate-50/50">
                      No CPU serial numbers scanned yet. Scan barcode tags using your hardware barcode gun above.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-xs font-mono">
                        <thead className="bg-slate-100/80 text-[10px] font-bold text-slate-600 uppercase sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Seq #</th>
                            <th className="px-3 py-2 text-left">CPU Serial Number</th>
                            <th className="px-3 py-2 text-left">Barcode Tag</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {scannedSerials.map((sn, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-3 py-2">
                                <span className="font-extrabold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                                  sn.{idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {sn}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-medium">
                                {sn.startsWith('CPU') ? sn : `CPU-${sn}`}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                  ✓ READY
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setScannedSerials(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 transition-colors"
                                  title="Remove this CPU from ticket"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Type Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Asset Type *
                </label>
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  {assetType} SELECTED
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { type: 'CPU', label: 'CPU (Tower/Desktop)', icon: Cpu },
                  { type: 'Mouse', label: 'Mouse (Peripheral)', icon: Mouse },
                  { type: 'Monitor', label: 'Monitor (Display)', icon: Monitor },
                  { type: 'Keyboard', label: 'Keyboard (Input)', icon: Keyboard },
                  { type: 'Laptop', label: 'Laptop / Notebook', icon: Laptop },
                  { type: 'Printer', label: 'Printer / Scanner', icon: Printer },
                  { type: 'Server', label: 'Server Blade', icon: Boxes },
                  { type: 'Other', label: 'Other Accessory', icon: Boxes },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = assetType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setAssetType(item.type as any)}
                      className={`py-2 px-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs ring-1 ring-blue-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      <span className="truncate">{item.type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Movement Route: From Floor ➜ Destination Floor */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Asset Movement Route (From Floor ➜ Destination Floor)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const temp = sourceLocation;
                    setSourceLocation(destinationFloor);
                    setDestinationFloor(temp);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs shrink-0"
                  title="Swap Source Floor and Destination Floor"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>Swap Route</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Floor (Origin / Source) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>From Floor (Origin) *</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {sourceLocation}
                    </span>
                  </label>
                  <select
                    value={sourceLocation}
                    onChange={(e) => setSourceLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {FLOOR_OPTIONS.map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                  {/* From Floor Quick Selection Buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {FLOOR_OPTIONS.slice(0, 6).map(floor => {
                      const isActive = sourceLocation === floor;
                      return (
                        <button
                          key={`from-${floor}`}
                          type="button"
                          onClick={() => setSourceLocation(floor)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          {floor}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Destination Floor (To Floor) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Destination Floor (To) *</span>
                    </span>
                    <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {destinationFloor}
                    </span>
                  </label>
                  <select
                    value={destinationFloor}
                    onChange={(e) => setDestinationFloor(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-blue-900 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {FLOOR_OPTIONS.map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                  {/* Destination Floor Quick Selection Buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {FLOOR_OPTIONS.slice(2, 8).map(floor => {
                      const isActive = destinationFloor === floor;
                      return (
                        <button
                          key={`to-${floor}`}
                          type="button"
                          onClick={() => setDestinationFloor(floor)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          {floor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Deployment Details: Target Floor */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Deployment Location & Target Floor</span>
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Target Floor <span className="text-slate-400 font-normal lowercase">(enter manually)</span>
                </label>
                <input
                  type="text"
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  placeholder="e.g. Floor 3 / Floor 7"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Reason for Movement *
              </label>
              <div className="relative">
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-xs appearance-none pr-8"
                >
                  <option value="Defective Replacement">Defective Replacement</option>
                  <option value="RAMP Up">RAMP Up</option>
                  <option value="New Deployment">New Deployment</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              {loading ? 'Submitting Movement Ticket...' : `Submit Ticket [${ticketNumber}] (${scannedSerials.length || 1} CPU${scannedSerials.length !== 1 ? 's' : ''} Scanned One-By-One)`}
            </button>
          </form>
        </div>

        {/* Raised Movement Tickets Ledger Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-2"><CompanyLogo size="sm" /></div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm">Movement Ticket Registry (Field Engineers)</h3>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full">
                  Asset Movement Execution
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Asset movement workflow is handled by engineers once authorized approval is updated by the manager</p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              {filteredTickets.length} / {tickets.length} Tickets
            </span>
          </div>

          {/* Status Filter Ribbon */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'OPEN', label: 'Open' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'WAITING_FOR_REPORTER', label: 'Waiting for Reporter' },
                { id: 'RESOLVED', label: 'Resolved' },
                { id: 'REOPENED', label: 'Reopened' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' }
              ].map(opt => {
                const count = opt.id === 'ALL' ? tickets.length : tickets.filter(t => t.status === opt.id).length;
                const isActive = tableStatusFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTableStatusFilter(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ticket ID & Mode (Locked)</th>
                  <th className="px-4 py-3">Asset Serial / Tag (Locked)</th>
                  <th className="px-4 py-3">Route Segment & Location</th>
                  <th className="px-4 py-3">Requestor & Engineer</th>
                  <th className="px-4 py-3">Approval & Workflow Status</th>
                  <th className="px-4 py-3 text-right">Status Action & Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-mono">
                      {tableStatusFilter === 'ALL' ? 'No movement tickets recorded. Fill form to raise a new movement ticket.' : `No tickets matching "${tableStatusFilter}".`}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr 
                      key={t.id} 
                      onClick={() => setSelectedTicketId(t.id)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                          <span>{t.ticket_no || `#TKT-${t.id}`}</span>
                          <span title="Locked (Manager Edit Only)"><Lock className="w-2.5 h-2.5 text-slate-400" /></span>
                          <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.movement_type === 'RETURN_TO_IT_ROOM' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              <ArrowRightLeft className="w-2.5 h-2.5 text-amber-700" />
                              <span>RETURN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                              <Building2 className="w-2.5 h-2.5 text-blue-700" />
                              <span>DEPLOY</span>
                            </span>
                          )}
                          {t.return_disposition === 'BACK_TO_STOCK' && (
                            <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                              📦 STOCK
                            </span>
                          )}
                          {t.return_disposition === 'BACK_TO_SCRAP' && (
                            <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                              🗑️ SCRAP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-blue-700">
                          <span>{t.asset_serial_number || t.asset_barcode}</span>
                          <span title="Locked (Manager Edit Only)"><Lock className="w-2.5 h-2.5 text-slate-400" /></span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-700">{t.asset_type || 'CPU'}</span>
                          {t.previous_floor_ticket_no && (
                            <span className="text-[9px] font-mono bg-amber-50 text-amber-800 px-1 py-0.2 rounded border border-amber-200">
                              Floor Entry: {t.previous_floor_ticket_no}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 font-semibold">
                          <span className="text-slate-600">{t.origin_location || 'IT Room'}</span>
                          <span className="text-blue-400">➜</span>
                          <span className="text-blue-900 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {t.destination_floor}
                          </span>
                        </div>
                        {t.port_number && t.port_number !== 'N/A' && (
                          <div className="mt-1 text-[10px] font-mono text-indigo-700 flex items-center gap-1">
                            <span className="font-bold">Port:</span>
                            <span className="bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 font-bold">{t.port_number}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{t.requestor_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Eng: <span className="font-medium text-slate-800">{t.engineer_name || 'Assigned Eng'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Appr:</span>
                            {renderApprovalBadge(t)}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Work:</span>
                            {renderStatusBadge(t.status)}
                          </div>
                          {(getApprovalStatus(t) === 'APPROVED' && (t.approved_by_name || t.approved_by || t.approved_by_id)) && (
                            <div className="text-[9px] text-slate-500 font-sans">
                              By: {t.approved_by_name || t.approved_by || t.approved_by_id}
                            </div>
                          )}
                          {(getApprovalStatus(t) === 'REJECTED' && t.rejection_reason) && (
                            <div className="text-[9px] text-rose-600 font-sans truncate max-w-[130px]" title={t.rejection_reason}>
                              {t.rejection_reason}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Action & Comments Column with dropdown and comments button */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={t.status}
                            disabled={transitioningStatus || getApprovalStatus(t) !== 'APPROVED'}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                            className={`px-2 py-1 border rounded-lg text-[11px] font-bold shadow-2xs ${
                              getApprovalStatus(t) !== 'APPROVED'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                                : 'bg-slate-50 border-slate-300 text-slate-800 cursor-pointer hover:bg-white focus:ring-2 focus:ring-blue-500'
                            }`}
                            title={getApprovalStatus(t) !== 'APPROVED' ? 'Movement status locked until authorized by Approval Manager' : 'Update Ticket Action Status'}
                          >
                            {getApprovalStatus(t) !== 'APPROVED' ? (
                              <option value={t.status}>Locked ({getApprovalStatus(t)})</option>
                            ) : (
                              <>
                                <option value="OPEN">Open</option>
                                <option value="PENDING">Pending</option>
                                <option value="WAITING_FOR_REPORTER">Waiting</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="REOPENED">Reopened</option>
                              </>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(t.id)}
                            className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                            title="Open Activity & Comments"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Comments</span>
                            {t.comments && t.comments.length > 0 && (
                              <span className="bg-blue-600 text-white group-hover:bg-white group-hover:text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                                {t.comments.length}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TICKET DETAIL & COMMENTS - ENTIRE FULL PAGE VIEW */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeCommentTicket && (
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-slate-100 flex flex-col w-screen h-screen overflow-hidden text-slate-900"
          >
            {/* Full-Page Command Bar Header */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-200"
                  title="Return to Ticket Creation Desk (Esc)"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Tickets</span>
                </button>

                <div className="h-5 w-px bg-slate-200" />

                <CompanyLogo size="sm" />

                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-mono text-sm font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                    {activeCommentTicket.ticket_no || `#TKT-${activeCommentTicket.id}`}
                  </span>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approval:</span>
                    {renderApprovalBadge(activeCommentTicket)}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workflow:</span>
                    {renderStatusBadge(activeCommentTicket.status)}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                    {activeCommentTicket.movement_type === 'RETURN_TO_IT_ROOM' ? 'RETURN TO IT ROOM' : 'DEPLOY TO FLOOR'}
                  </span>
                </div>
              </div>

              {/* Status Workflow Transitions & Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {activeCommentTicket.status !== 'RESOLVED' ? (
                    <button
                      type="button"
                      disabled={transitioningStatus}
                      onClick={() => handleUpdateStatus(activeCommentTicket.id, 'RESOLVED', 'Ticket marked as Resolved by engineer')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Mark as Resolved"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={transitioningStatus}
                      onClick={() => handleUpdateStatus(activeCommentTicket.id, 'REOPENED', 'Ticket reopened by engineer')}
                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Reopen Ticket"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}

                  {activeCommentTicket.status !== 'WAITING_FOR_REPORTER' && (
                    <button
                      type="button"
                      disabled={transitioningStatus}
                      onClick={() => handleUpdateStatus(activeCommentTicket.id, 'WAITING_FOR_REPORTER', 'Waiting for information from reporter')}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      title="Set Waiting for Reporter"
                    >
                      <span>Waiting for Reporter</span>
                    </button>
                  )}

                  {(activeCommentTicket.status === 'WAITING_FOR_REPORTER' || activeCommentTicket.status === 'PENDING') && (
                    <button
                      type="button"
                      disabled={transitioningStatus}
                      onClick={() => handleUpdateStatus(activeCommentTicket.id, 'OPEN', 'Ticket status set to Open / In Progress')}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      title="Set to Open"
                    >
                      <span>Open</span>
                    </button>
                  )}

                  <div className="h-4 w-px bg-slate-200 mx-0.5" />

                  <select
                    value={activeCommentTicket.status}
                    disabled={transitioningStatus}
                    onChange={(e) => handleUpdateStatus(activeCommentTicket.id, e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PENDING">PENDING</option>
                    <option value="WAITING_FOR_REPORTER">WAITING FOR REPORTER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REOPENED">REOPENED</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Ticket (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Full-Page Scrollable Main Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left / Center Main Content (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Title & Core Overview Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                          Hardware Movement Dossier
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{activeCommentTicket.asset_type || 'CPU'} Movement Ticket: {activeCommentTicket.ticket_no || `#TKT-${activeCommentTicket.id}`}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 inline-flex items-center gap-1 font-sans" title="Locked (Manager Edit Only)">
                            <Lock className="w-3 h-3 text-slate-500" />
                            LOCKED
                          </span>
                        </h2>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Asset Serial</span>
                          <span title="Locked (Manager Edit Only)"><Lock className="w-2.5 h-2.5 text-slate-400" /></span>
                        </div>
                        <span className="font-mono font-bold text-blue-950 text-sm truncate block">{activeCommentTicket.asset_serial_number || activeCommentTicket.asset_barcode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Route Segment</span>
                        <span className="font-bold text-slate-800 truncate block">{activeCommentTicket.origin_location} ➜ {activeCommentTicket.destination_floor}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Approval Status</span>
                        <div className="mt-0.5">{renderApprovalBadge(activeCommentTicket)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Requestor</span>
                        <span className="font-semibold text-slate-800 truncate block">{activeCommentTicket.requestor_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Assigned Engineer</span>
                        <span className="font-semibold text-slate-800 truncate block">{activeCommentTicket.engineer_name || 'Field Engineer'}</span>
                      </div>
                    </div>

                    {/* Reason for Movement & Bay Location */}
                    <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reason for Movement</span>
                        <span className="font-bold text-slate-900 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200 font-mono text-xs">
                          {activeCommentTicket.reason || 'New Deployment'}
                        </span>
                      </div>
                      {activeCommentTicket.target_room && (
                        <div className="text-slate-600 flex items-center justify-between pt-1">
                          <span className="font-semibold text-slate-600">Target Location / Floor Bay:</span>
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{activeCommentTicket.target_room}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Stream & Comments (Full Width & Spacious) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <TicketCommentsView
                      ticketId={activeCommentTicket.id}
                      ticketNo={activeCommentTicket.ticket_no || `#TKT-${activeCommentTicket.id}`}
                      ticketStatus={activeCommentTicket.status}
                      approvalStatus={activeCommentTicket.approval_status}
                      comments={activeCommentTicket.comments}
                      currentAuthorName={engineerName}
                      currentRole="IT Field Engineer"
                      onCommentAdded={onRefresh}
                      onStatusUpdated={(newStatus) => {
                        handleUpdateStatus(activeCommentTicket.id, newStatus);
                      }}
                    />
                  </div>
                </div>

                {/* Right Sidebar Details Panel (4 cols) */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Status & Attributes Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                      Ticket Specifications & Attributes
                    </h3>

                    <div className="space-y-3">
                      {/* Approval Status Card */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Approval Status</span>
                          <div>{renderApprovalBadge(activeCommentTicket)}</div>
                        </div>

                        {(activeCommentTicket.approved_by_name || activeCommentTicket.approved_by) && (
                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/80">
                            <span className="text-slate-500">Approved By</span>
                            <span className="font-bold text-emerald-800">{activeCommentTicket.approved_by_name || activeCommentTicket.approved_by}</span>
                          </div>
                        )}

                        {activeCommentTicket.approved_at && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Decision Date</span>
                            <span className="font-mono text-slate-700">{new Date(activeCommentTicket.approved_at).toLocaleString()}</span>
                          </div>
                        )}

                        {activeCommentTicket.clearance_id && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Clearance Pass ID</span>
                            <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">{activeCommentTicket.clearance_id}</span>
                          </div>
                        )}

                        {activeCommentTicket.rejection_reason && (
                          <div className="pt-1.5 text-[11px] text-rose-800 font-medium border-t border-rose-200">
                            <span className="font-bold block text-rose-900">Rejection Reason:</span>
                            <span>{activeCommentTicket.rejection_reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Workflow Status</span>
                        <div>{renderStatusBadge(activeCommentTicket.status)}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                          Change Workflow Status
                        </label>
                        <select
                          value={activeCommentTicket.status}
                          disabled={transitioningStatus}
                          onChange={(e) => handleUpdateStatus(activeCommentTicket.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="PENDING">PENDING</option>
                          <option value="WAITING_FOR_REPORTER">WAITING FOR REPORTER</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="REOPENED">REOPENED</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Assigned Engineer</span>
                        <span className="font-bold text-slate-900">{activeCommentTicket.engineer_name || 'Basavaraj SK'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Engineer Employee ID</span>
                        <span className="font-mono text-slate-700">{activeCommentTicket.engineer_emp_id || 'ENG-01088201'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Requestor Employee ID</span>
                        <span className="font-mono text-slate-700">{activeCommentTicket.requestor_emp_id || 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Created At</span>
                        <span className="font-mono text-slate-700">{new Date(activeCommentTicket.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Backtrack Details (if applicable) */}
                  {activeCommentTicket.previous_floor_ticket_no && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5 text-xs">
                      <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">
                        Floor Return Backtrack Chain
                      </span>
                      <p className="text-amber-950 font-mono text-[11px]">
                        Origin Floor Ticket: <strong>{activeCommentTicket.previous_floor_ticket_no}</strong> ({activeCommentTicket.previous_floor})
                      </p>
                    </div>
                  )}

                  {/* Quick Exit Navigation */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                    <p className="text-[11px] text-slate-500">Finished reviewing ticket details and comments?</p>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Return to Ticket Desk
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
