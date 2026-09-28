import React, { useState, useRef, useEffect } from 'react';
import { Asset, MovementTicket } from '../types';
import { 
  Plus, ScanBarcode, Download, CheckCircle2, Cpu, Zap, X, Trash2, FileText, 
  AlertTriangle, ShieldCheck, ArrowRightLeft, MapPin, Building2, User, UserCheck, 
  ChevronDown, Boxes, RotateCcw, Monitor, Mouse, Keyboard, Laptop, Printer, History
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

export default function MovementDesk({ assets, tickets, onRefresh }: MovementDeskProps) {
  // Form State
  const [ticketNumber, setTicketNumber] = useState('TKT-2026-001');
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
  const [targetRoom, setTargetRoom] = useState('Workstation Bay 304');
  const [portNumber, setPortNumber] = useState('SW03-P18');
  const [reason, setReason] = useState('IT Infrastructure upgrade / workstation deployment');

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

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode scanner input field on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

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
      setReason(`Hardware return to IT Room — ${returnDisposition === 'BACK_TO_SCRAP' ? 'BACK TO SCRAP (Damaged/Condemned)' : 'BACK TO STOCK (Reusable Inventory)'}`);
    } else {
      setSourceLocation('IT Room');
      setDestinationFloor('Floor 3');
      setTargetRoom('Workstation Bay 304');
      setReason('IT Infrastructure upgrade / workstation deployment');
    }
  };

  // Handle Return Disposition toggle
  const handleDispositionChange = (disp: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP') => {
    setReturnDisposition(disp);
    if (movementMode === 'RETURN_TO_IT_ROOM') {
      setReason(`Hardware return to IT Room — ${disp === 'BACK_TO_SCRAP' ? 'BACK TO SCRAP (Damaged/Condemned)' : 'BACK TO STOCK (Reusable Inventory)'}`);
    }
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0 font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">IT Field Engineer Ticket Desk</h2>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                TICKET CREATION
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter ticket number manually and scan CPU serial numbers sequentially via barcode scanner.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={tickets.length === 0}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV ({tickets.length})</span>
        </button>
      </div>

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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDispositionChange('BACK_TO_STOCK')}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      returnDisposition === 'BACK_TO_STOCK'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                    }`}
                  >
                    <Boxes className="w-4 h-4 shrink-0" />
                    <div>
                      <div>Back to Stock</div>
                      <div className="text-[10px] font-normal opacity-85">Tested / Reusable Inventory</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispositionChange('BACK_TO_SCRAP')}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      returnDisposition === 'BACK_TO_SCRAP'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <div>
                      <div>Back to Scrap</div>
                      <div className="text-[10px] font-normal opacity-85">Defective / Damaged Hardware</div>
                    </div>
                  </button>
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
                        placeholder="e.g. TKT-0001"
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
                    placeholder="E.G. TKT-2026-001"
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

            {/* Destination Deployment Details: Room & Network Switch Port Number */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Deployment Location & Port Number *</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  PORT ALLOCATION
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Target Room / Workstation Bay
                  </label>
                  <input
                    type="text"
                    value={targetRoom}
                    onChange={(e) => setTargetRoom(e.target.value)}
                    placeholder="e.g. Finance Desk 304 / Bay-A"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Port Number (Switch / Patch Panel) *
                    </label>
                    {portNumber && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        tickets.some(t => t.destination_floor?.toUpperCase() === destinationFloor.toUpperCase() && t.port_number?.toUpperCase() === portNumber.trim().toUpperCase() && (t.status === 'PENDING' || t.status === 'APPROVED'))
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {tickets.some(t => t.destination_floor?.toUpperCase() === destinationFloor.toUpperCase() && t.port_number?.toUpperCase() === portNumber.trim().toUpperCase() && (t.status === 'PENDING' || t.status === 'APPROVED'))
                          ? '⚠️ PORT IN USE'
                          : '✓ PORT FREE'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={portNumber}
                    onChange={(e) => setPortNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. SW03-P18, Port 24, P-08"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 bg-white uppercase"
                  />
                  {/* Quick port suggestions */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {['SW03-P14', 'SW03-P18', 'SW07-P24', 'Port-08', 'Port-24'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPortNumber(p)}
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer border ${
                          portNumber === p
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Reason for Movement *
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 bg-white"
              />
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
              <h3 className="font-bold text-slate-900 text-sm">Movement Ticket Registry</h3>
              <p className="text-[11px] text-slate-500">Active movement tickets raised by IT Engineers</p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              {tickets.length} Tickets
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ticket ID & Mode</th>
                  <th className="px-4 py-3">Asset Serial / Tag</th>
                  <th className="px-4 py-3">Route Segment & Port</th>
                  <th className="px-4 py-3">Requestor & Engineer</th>
                  <th className="px-4 py-3 text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-mono">
                      No movement tickets recorded. Fill form to raise a new movement ticket.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{t.ticket_no || `#TKT-${t.id}`}</div>
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
                        <div className="font-bold text-blue-700">{t.asset_serial_number || t.asset_barcode}</div>
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
                      <td className="px-4 py-3 text-right">
                        {t.status === 'PENDING' ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⏳ PENDING
                          </span>
                        ) : t.status === 'APPROVED' ? (
                          <div className="text-right">
                            <span className="inline-flex items-center text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ APPROVED
                            </span>
                            {(t.approved_by_name || t.approved_by || t.approved_by_id) && (
                              <div className="text-[9px] text-slate-500 font-sans mt-0.5">
                                By: {t.approved_by_name || t.approved_by || t.approved_by_id}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            ✕ REJECTED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
