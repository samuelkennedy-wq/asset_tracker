import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, MovementTicket, GateScanLog } from '../types';
import { 
  Package, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Search, 
  ScanBarcode, 
  ShieldCheck, 
  Server, 
  Cpu, 
  Layers, 
  Activity, 
  Truck, 
  Sparkles, 
  RotateCcw,
  Building2,
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';
import HardwareBarcodeScanner from './HardwareBarcodeScanner';
import { validateAndCleanSerial } from '../utils/serialValidator';

interface LiveAssetJourneyTrackerProps {
  assets: Asset[];
  tickets: MovementTicket[];
  scanLogs?: GateScanLog[];
  initialSearchSerial?: string;
  onClose?: () => void;
}

export default function LiveAssetJourneyTracker({
  assets,
  tickets,
  scanLogs = [],
  initialSearchSerial = '',
  onClose
}: LiveAssetJourneyTrackerProps) {
  const [searchInput, setSearchInput] = useState(initialSearchSerial);
  const [activeSerial, setActiveSerial] = useState(initialSearchSerial || (assets[0]?.serial_number || ''));
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Normalize search query
  const cleanActiveSerial = (activeSerial || '').trim().toUpperCase();

  // Find asset profile
  const matchedAsset = useMemo(() => {
    if (!cleanActiveSerial) return null;
    return assets.find(a => 
      a.serial_number?.toUpperCase() === cleanActiveSerial || 
      a.barcode?.toUpperCase() === cleanActiveSerial
    ) || null;
  }, [assets, cleanActiveSerial]);

  // Find all tickets related to this asset
  const assetTickets = useMemo(() => {
    if (!cleanActiveSerial) return [];
    return tickets.filter(t => {
      const serials = (t.asset_serial_number || '').toUpperCase();
      const barcodes = (t.asset_barcode || '').toUpperCase();
      return serials.includes(cleanActiveSerial) || barcodes.includes(cleanActiveSerial);
    }).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [tickets, cleanActiveSerial]);

  // Find all gate scan events related to this asset
  const assetScanLogs = useMemo(() => {
    if (!cleanActiveSerial) return [];
    return scanLogs.filter(l => {
      const s = ((l.serial_number || l.barcode) || '').toUpperCase();
      return s.includes(cleanActiveSerial);
    }).sort((a, b) => new Date(b.scanned_at || '').getTime() - new Date(a.scanned_at || '').getTime());
  }, [scanLogs, cleanActiveSerial]);

  // Latest ticket for this asset
  const latestTicket = assetTickets[0] || null;

  // Determine Current Stage (Amazon Parcel Timeline Simulation)
  // Stage 1: Registered in IT Room / Origin Stock
  // Stage 2: Ticket Created & Pending Approval
  // Stage 3: Manager Approved & Ready for Transit
  // Stage 4: Platina Security Gate Scanned & Cleared
  // Stage 5: In Transit / Arrived at Destination Floor & Bay
  const journeyStages = useMemo(() => {
    const hasTicket = !!latestTicket;
    const isApproved = hasTicket && (latestTicket.status === 'APPROVED' || latestTicket.status === 'CLEARED' || !!latestTicket.clearance_id);
    const isGateCleared = hasTicket && (latestTicket.status === 'CLEARED' || assetScanLogs.some(l => l.status === 'PASS' || l.status === 'CLEARED'));
    const isDeployed = (matchedAsset?.status === 'DEPLOYED' || isGateCleared);

    return [
      {
        id: 'STAGE_1_ORIGIN',
        step: 1,
        title: 'IT Warehouse Stock Depot',
        sub: 'Asset Registered & Serial Tagged',
        location: matchedAsset?.origin_location || latestTicket?.origin_location || 'IT_ROOM Stock Room',
        timestamp: matchedAsset?.created_at || 'Registered in Inventory',
        isComplete: true,
        isCurrent: !hasTicket,
        icon: Server
      },
      {
        id: 'STAGE_2_TICKET',
        step: 2,
        title: 'Transit Movement Ticket Filed',
        sub: latestTicket ? `Ticket: ${latestTicket.ticket_no || '#' + latestTicket.id}` : 'No Active Ticket',
        location: latestTicket?.requestor_name ? `Requested by ${latestTicket.requestor_name}` : 'Awaiting Request',
        timestamp: latestTicket?.created_at ? new Date(latestTicket.created_at).toLocaleString() : 'Pending',
        isComplete: hasTicket,
        isCurrent: hasTicket && !isApproved,
        icon: Package
      },
      {
        id: 'STAGE_3_APPROVED',
        step: 3,
        title: 'Manager Governance Sign-Off',
        sub: isApproved ? `Approved by ${latestTicket?.approved_by_name || 'Jyothi Potula'}` : 'Awaiting Approval',
        location: isApproved ? 'Digital Clearance Pass Generated' : 'Approval Manager Desk',
        timestamp: latestTicket?.approved_at ? new Date(latestTicket.approved_at).toLocaleString() : (isApproved ? 'Approved' : 'Pending'),
        isComplete: isApproved,
        isCurrent: isApproved && !isGateCleared,
        icon: ShieldCheck
      },
      {
        id: 'STAGE_4_GATE',
        step: 4,
        title: 'Platina Security Perimeter Gate',
        sub: isGateCleared ? 'Dual-Barcode Laser Verified & Cleared' : 'Physical Gate Checkpoint',
        location: 'Ground Floor / Platina Facility Gate',
        timestamp: assetScanLogs[0]?.scanned_at ? new Date(assetScanLogs[0].scanned_at).toLocaleString() : (isGateCleared ? 'Cleared Gate' : 'Pending Gate Scan'),
        isComplete: isGateCleared,
        isCurrent: isGateCleared && !isDeployed,
        icon: ScanBarcode
      },
      {
        id: 'STAGE_5_DELIVERED',
        step: 5,
        title: 'Delivered & Connected at Floor Bay',
        sub: latestTicket?.destination_floor ? `${latestTicket.destination_floor} (Switch Port: ${latestTicket.port_number || 'P-204'})` : 'Production Floor',
        location: latestTicket?.target_room || (matchedAsset?.current_location || 'Floor Workspace'),
        timestamp: isDeployed ? 'Active on Floor' : 'En Route',
        isComplete: isDeployed,
        isCurrent: isDeployed,
        icon: MapPin
      }
    ];
  }, [matchedAsset, latestTicket, assetScanLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveSerial(searchInput.trim().toUpperCase());
    }
  };

  const handleQuickSelect = (sn: string) => {
    setSearchInput(sn);
    setActiveSerial(sn);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col space-y-6 p-5 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Live Asset Movement Journey Tracker
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-600" />
                PARCEL-STYLE TIMELINE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time delivery progress: Scan or enter any CPU Serial Number to pinpoint its exact transit location.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-start sm:self-center p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search & Scanner Input Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter CPU Serial Number (e.g. S/N-H92G4K, S/N-78F8A2, S/N-L34D9W)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Track Location</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <ScanBarcode className="w-4 h-4 text-amber-400" />
            <span>Scan Barcode Gun / Camera</span>
          </button>
        </form>

        {/* Quick Click Asset Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Quick Track:</span>
          {assets.slice(0, 6).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleQuickSelect(a.serial_number)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                cleanActiveSerial === a.serial_number?.toUpperCase()
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {a.serial_number} ({a.current_location})
            </button>
          ))}
        </div>
      </div>

      {/* Current Location Live Status Banner (Grafana / Amazon Parcel Style) */}
      {matchedAsset ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/30 text-blue-300 border border-blue-400/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                  LIVE PARCEL STATUS
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Asset Tag: {matchedAsset.barcode}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
                <span>{matchedAsset.serial_number}</span>
                <span className="text-sm font-sans font-bold text-slate-300">({matchedAsset.model})</span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-0.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Current Geographic Coordinates:</span>
                <strong className="text-emerald-300 font-bold font-mono">
                  {matchedAsset.current_location || latestTicket?.destination_floor || 'IT Stock Room'}
                </strong>
                {latestTicket?.port_number && (
                  <span className="bg-slate-800 text-indigo-300 border border-slate-700 text-[10px] font-mono px-2 py-0.5 rounded ml-1">
                    Port: {latestTicket.port_number}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 p-3 rounded-xl backdrop-blur-sm self-start md:self-auto">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Transit Status</div>
                <div className="text-white font-bold font-mono">
                  {latestTicket ? (latestTicket.status === 'CLEARED' ? 'DELIVERED & CONNECTED' : latestTicket.status) : 'STATIONARY IN STOCK'}
                </div>
                <div className="text-emerald-400 text-[10px] font-mono">
                  {latestTicket?.ticket_no || 'No active transit'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center text-amber-900 space-y-1">
          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
          <h4 className="font-bold text-sm">No Asset Found for "{cleanActiveSerial}"</h4>
          <p className="text-xs text-amber-700">
            Please verify the serial number or click one of the quick tracking tags above.
          </p>
        </div>
      )}

      {/* AMAZON-STYLE VISUAL DELIVERY JOURNEY TIMELINE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Interactive Chain-of-Custody Timeline (Stage 1 to 5)</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-500">Real-Time Progression</span>
        </div>

        {/* Horizontal Progress Bar on Desktop */}
        <div className="hidden lg:grid grid-cols-5 gap-2 relative pt-2 pb-6">
          {journeyStages.map((stg, idx) => {
            const Icon = stg.icon;
            return (
              <div key={stg.id} className="relative flex flex-col items-center text-center">
                {/* Connecting Line between steps */}
                {idx < journeyStages.length - 1 && (
                  <div 
                    className={`absolute top-5 left-1/2 w-full h-1 -z-0 transition-all ${
                      stg.isComplete ? 'bg-blue-600' : 'bg-slate-200'
                    }`} 
                  />
                )}

                {/* Step Circle Badge */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all shadow-sm ${
                  stg.isComplete 
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                    : stg.isCurrent 
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Step Details */}
                <div className="mt-3 space-y-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    stg.isComplete ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    Step {stg.step}
                  </span>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {stg.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {stg.sub}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {stg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vertical Stepper on Mobile / Tablet */}
        <div className="lg:hidden space-y-4 relative pl-4 border-l-2 border-slate-200 ml-3">
          {journeyStages.map((stg) => {
            const Icon = stg.icon;
            return (
              <div key={stg.id} className="relative pl-6">
                <div className={`absolute -left-[27px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  stg.isComplete 
                    ? 'bg-blue-600 text-white' 
                    : stg.isCurrent 
                    ? 'bg-amber-500 text-white animate-pulse' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Step {stg.step}: {stg.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{stg.timestamp}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">{stg.sub}</div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{stg.location}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Movement Logs & Scan Events Table */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Audit Checkpoint Logs for Serial: {cleanActiveSerial}</span>
          </h4>
          <span className="text-xs font-mono font-bold text-slate-600">
            {assetScanLogs.length} Gate Scans | {assetTickets.length} Movement Tickets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left bg-white rounded-lg border border-slate-200">
            <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Checkpoint Event</th>
                <th className="px-3 py-2.5">Ticket #</th>
                <th className="px-3 py-2.5">From ➔ To</th>
                <th className="px-3 py-2.5">Switch Port</th>
                <th className="px-3 py-2.5">Responsible Actor</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {assetTickets.length === 0 && assetScanLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400 font-sans">
                    No movement records or gate scans registered yet for this serial tag.
                  </td>
                </tr>
              ) : (
                assetTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at || '').toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-sans font-bold text-slate-900">
                      Floor Transit Order
                    </td>
                    <td className="px-3 py-2.5 font-bold text-blue-700">
                      {t.ticket_no || `#TKT-${t.id}`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-sans whitespace-nowrap">
                      {t.origin_location} ➔ <strong className="text-slate-900">{t.destination_floor}</strong>
                    </td>
                    <td className="px-3 py-2.5 text-indigo-700 font-bold">
                      {t.port_number || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-sans">
                      {t.engineer_name || t.requestor_name || 'System Admin'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
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

      {/* Hardware Barcode Scanner Modal for instant optical/gun scanning */}
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
                  <h3 className="font-bold text-slate-900 text-sm">Scan Serial for Live Parcel Tracking</h3>
                </div>
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <HardwareBarcodeScanner
                targetMode="PHYSICAL_CPU"
                onScan={(val) => {
                  setShowScannerModal(false);
                  const res = validateAndCleanSerial(val);
                  if (res.cleanSerial) {
                    setSearchInput(res.cleanSerial);
                    setActiveSerial(res.cleanSerial);
                  }
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
