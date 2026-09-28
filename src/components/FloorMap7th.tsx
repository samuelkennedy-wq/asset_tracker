import React, { useState } from 'react';
import { Asset, MovementTicket } from '../types';
import { Map, Layers, Laptop, ArrowRight, CheckCircle, ShieldAlert, Plus, Users, Compass, HelpCircle, Activity } from 'lucide-react';

interface FloorMap7thProps {
  assets: Asset[];
  tickets: MovementTicket[];
  onRefresh: () => void;
  onSelectBarcodeForScan: (barcode: string) => void;
  onNavigateToTab: (tab: 'movement' | 'scanner') => void;
}

interface MapZone {
  id: string;
  name: string;
  type: 'cluster' | 'room' | 'passage' | 'security';
  description: string;
  capacity?: string;
  gridArea?: string; // Tailwind grid coordinates or class helper
}

const MAP_ZONES: MapZone[] = [
  // Top row rooms (Left to Right)
  { id: 'BREAKOUT_02', name: 'Breakout-02 Lounge', type: 'room', description: 'Social recreation area, 650 sq.ft, left wing', capacity: '15 Seats' },
  { id: 'MTG_10P', name: '10P Meeting Room', type: 'room', description: 'Large conference room, 240 sq.ft, whiteboard equipped', capacity: '10 Seats' },
  { id: 'AVP_ROOM', name: 'AVP Office', type: 'room', description: 'Assistant Vice President cabin, executive desk', capacity: '1 Desk' },
  { id: 'DIRECTOR_ROOM', name: 'Director Suite', type: 'room', description: 'Managing Director suite, 80 SFT, high-backed seating', capacity: '1 Desk' },
  { id: 'STORE_ROOM', name: 'Store Room', type: 'room', description: 'Hardware storage, 200 sq.ft, locked rack cabinets', capacity: 'Storage Rack' },
  { id: 'HUB_ROOM_01', name: 'Hub Room Left', type: 'room', description: 'Network distribution room, 202 sq.ft, fiber patch panels', capacity: 'MDF Rack' },
  
  // Top right wing rooms
  { id: 'BREAKOUT_01', name: 'Breakout-01 Cafeteria', type: 'room', description: 'Pantry, vending machines, 560 sq.ft, right wing', capacity: '12 Seats' },
  { id: 'STORE_02', name: 'Store Right', type: 'room', description: 'General utility room, 100 sq.ft', capacity: 'Storage Rack' },
  { id: 'MTG_8P', name: '8P Meeting Room', type: 'room', description: 'Client discussion room, 224 sq.ft', capacity: '8 Seats' },
  { id: 'HUB_ROOM_02', name: 'Hub Room Right', type: 'room', description: 'Network satellite closet, 188 sq.ft', capacity: 'IDF Rack' },
  { id: 'ELECTRICAL_DB', name: 'Electrical DB Room', type: 'room', description: 'Power distribution boards, 60 sq.ft, restricted access', capacity: 'DB Boards' },

  // Center row (middle)
  { id: 'TRAINING_444', name: 'Training Room (444)', type: 'room', description: 'Left training bay, dual projectors, 444 sq.ft', capacity: '20 Desks' },
  { id: 'ELECTRICAL_ROOM', name: 'Electrical Room Main', type: 'room', description: 'Main electrical room, 182 sq.ft', capacity: 'Transformer Rack' },
  { id: 'SECURITY_GATE', name: 'Security Checkpoint Gate', type: 'security', description: 'Entrance gate, physical turnstiles & barcode scanners', capacity: 'Guard Desk' },
  { id: 'TRAINING_461', name: 'Training Room (461)', type: 'room', description: 'Right training bay, AV-integrated, 461 sq.ft', capacity: '24 Desks' },

  // Clusters (Left Wing to Right Wing)
  { id: 'CLUSTER_1', name: 'Cluster 1', type: 'cluster', description: 'Southwest production bay, 36 workstations' },
  { id: 'CLUSTER_2', name: 'Cluster 2', type: 'cluster', description: 'Southwest support workstations, 36 desks' },
  { id: 'CLUSTER_3', name: 'Cluster 3', type: 'cluster', description: 'South-central production desks, 42 workstations' },
  { id: 'CLUSTER_4', name: 'Cluster 4', type: 'cluster', description: 'South-central engineering desks, 42 workstations' },
  { id: 'CLUSTER_5', name: 'Cluster 5', type: 'cluster', description: 'Southeast operations, 36 workstations' },
  { id: 'CLUSTER_6', name: 'Cluster 6', type: 'cluster', description: 'Southeast development, 36 workstations' },
  { id: 'CLUSTER_7', name: 'Cluster 7', type: 'cluster', description: 'Far-southwest operations, 42 workstations' },
  { id: 'CLUSTER_8', name: 'Cluster 8', type: 'cluster', description: 'Far-southwest support, 42 workstations' },
  { id: 'CLUSTER_9', name: 'Cluster 9', type: 'cluster', description: 'Far-south-central support, 42 workstations' },
  { id: 'CLUSTER_10', name: 'Cluster 10', type: 'cluster', description: 'Far-south-central billing support, 42 workstations' },
  { id: 'CLUSTER_11', name: 'Cluster 11', type: 'cluster', description: 'Far-southeast tech support, 42 workstations' },
  { id: 'CLUSTER_12', name: 'Cluster 12', type: 'cluster', description: 'Far-southeast helpdesk, 42 workstations' },
  { id: 'CLUSTER_13', name: 'Cluster 13', type: 'cluster', description: 'Right-wing support group, 30 workstations' },
  { id: 'CLUSTER_14', name: 'Cluster 14', type: 'cluster', description: 'Right-wing executive cluster, 18 workstations' },
  { id: 'CLUSTER_15', name: 'Cluster 15', type: 'cluster', description: 'Right-wing quality analysis, 24 workstations' }
];

export default function FloorMap7th({ assets, tickets, onRefresh, onSelectBarcodeForScan, onNavigateToTab }: FloorMap7thProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('CLUSTER_3');
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [newRequestor, setNewRequestor] = useState('Samuel Kennedy');
  const [selectedBarcodeToMove, setSelectedBarcodeToMove] = useState('');
  const [submittingMvt, setSubmittingMvt] = useState(false);
  const [mvtSuccess, setMvtSuccess] = useState('');
  const [mvtError, setMvtError] = useState('');

  // Find assets currently on FLOOR_7 that match this zone in their target_room / description
  const getAssetsInZone = (zoneId: string) => {
    const zone = MAP_ZONES.find(z => z.id === zoneId);
    if (!zone) return [];

    return assets.filter(asset => {
      // If current location explicitly has this zone ID or matches the zone name
      const loc = asset.current_location.toUpperCase().trim();
      const inFloor7 = loc === 'FLOOR_7';
      if (!inFloor7) return false;

      // Find the last completed ticket for this asset to Floor 7 to know its room/cluster
      const lastFulfillTicket = [...tickets]
        .filter(t => t.asset_barcode === asset.barcode && t.destination_floor === 'FLOOR_7' && t.status === 'APPROVED')
        .sort((a, b) => b.id - a.id)[0];

      if (lastFulfillTicket && lastFulfillTicket.target_room) {
        const roomUpper = lastFulfillTicket.target_room.toUpperCase();
        return roomUpper.includes(zone.id) || roomUpper.includes(zone.name.toUpperCase());
      }

      // Fallback: If no completed ticket contains details, let's look at the asset details or fallback
      // (or let's map some seeded ones by default based on barcode suffix)
      if (zoneId === 'CLUSTER_3' && asset.barcode === 'CPU90003') return true;
      if (zoneId === 'TRAINING_444' && asset.barcode === 'CPU90006') return true;

      return false;
    });
  };

  // Find incoming movement tickets heading to this zone on FLOOR_7
  const getIncomingTicketsForZone = (zoneId: string) => {
    const zone = MAP_ZONES.find(z => z.id === zoneId);
    if (!zone) return [];

    return tickets.filter(t => {
      const isFloor7 = t.destination_floor === 'FLOOR_7';
      const isPendingOrApproved = t.status === 'PENDING' || t.status === 'APPROVED';
      if (!isFloor7 || !isPendingOrApproved) return false;

      // Check if ticket is actually still in transit (asset hasn't arrived at FLOOR_7 yet)
      const asset = assets.find(a => a.barcode === t.asset_barcode);
      const notYetArrived = asset && asset.current_location !== 'FLOOR_7';
      if (!notYetArrived) return false;

      if (t.target_room) {
        const roomUpper = t.target_room.toUpperCase();
        return roomUpper.includes(zone.id) || roomUpper.includes(zone.name.toUpperCase());
      }
      return false;
    });
  };

  const selectedZone = MAP_ZONES.find(z => z.id === selectedZoneId) || MAP_ZONES[0];
  const zoneAssets = getAssetsInZone(selectedZone.id);
  const zoneIncoming = getIncomingTicketsForZone(selectedZone.id);

  // Available CPUs in IT_ROOM or STOCK to select for movement
  const availableCpus = assets.filter(a => a.current_location === 'IT_ROOM' || a.current_location === 'STOCK');

  const handleCreateMovementTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarcodeToMove) {
      setMvtError('Please select a CPU asset to initiate movement.');
      return;
    }
    setMvtError('');
    setMvtSuccess('');
    setSubmittingMvt(true);

    try {
      const res = await fetch('/api/movement/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: selectedBarcodeToMove,
          destination: 'FLOOR_7',
          target_room: `${selectedZone.name} (Asbuilt Layout)`,
          requestor: newRequestor
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMvtSuccess(`Successfully created ticket #MVT-${data.ticket.id}! Standard custody path is locked. Please approve the ticket and scan at IT_ROOM Gate.`);
        setSelectedBarcodeToMove('');
        onRefresh();
      } else {
        const err = await res.json();
        setMvtError(err.error || 'Failed to generate ticket.');
      }
    } catch (err) {
      setMvtError('Connection timed out to Express server.');
    } finally {
      setSubmittingMvt(false);
    }
  };

  const handleApproveTicketDirectly = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/movement/approve/${ticketId}`, {
        method: 'POST'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" id="floor-7-container">
      
      {/* 1. Visual Schematic Map Box */}
      <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3.5 mb-5 gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <span>[24]7 Seventh Floor Interactive Schematic</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Physical layout numbering mapping. Click on any cluster or room to inspect custodianship.</p>
            </div>
            
            {/* Legend / Stats */}
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600 border border-indigo-700 inline-block"></span>
                <span>Active CPU</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-600 inline-block animate-pulse"></span>
                <span>Pending Transit</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300 inline-block"></span>
                <span>Idle/Empty Workspace</span>
              </span>
            </div>
          </div>

          {/* Interactive SVG / Layout Mock */}
          <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 relative overflow-hidden select-none">
            {/* Top Corridor Label */}
            <div className="text-[10px] font-mono text-blue-700 uppercase tracking-widest text-center mb-4 font-bold">
              1800mm Wide Main Passage & Breakout Corridors
            </div>

            {/* Layout Grid Wrapper */}
            <div className="grid grid-cols-6 gap-3.5" id="schematic-layout-grid">
              
              {/* TOP ROW: EXECUTIVE, MEETINGS & PANTRY */}
              <div className="col-span-6 grid grid-cols-6 gap-2">
                {/* Breakout-02 Left */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('BREAKOUT_02')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'BREAKOUT_02'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">BO-02</span>
                    {getAssetsInZone('BREAKOUT_02').length > 0 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">Breakout-02</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">650 sq.ft</p>
                </button>

                {/* 10P MTG Room */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('MTG_10P')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'MTG_10P'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">10P MTG</span>
                    {getAssetsInZone('MTG_10P').length > 0 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">10P Meeting</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">240 sq.ft</p>
                </button>

                {/* Director Office */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('DIRECTOR_ROOM')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'DIRECTOR_ROOM'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">DIR</span>
                    {getAssetsInZone('DIRECTOR_ROOM').length > 0 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">Director Suite</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">80 SFT</p>
                </button>

                {/* Hub Room Left */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('HUB_ROOM_01')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'HUB_ROOM_01'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-rose-600 uppercase font-bold">MDF</span>
                    {getAssetsInZone('HUB_ROOM_01').length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">Hub Room Left</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">202 sq.ft</p>
                </button>

                {/* Breakout-01 Cafeteria Right */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('BREAKOUT_01')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'BREAKOUT_01'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">BO-01</span>
                    {getAssetsInZone('BREAKOUT_01').length > 0 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">Breakout-01</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">560 sq.ft</p>
                </button>

                {/* 8P MTG Room */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('MTG_8P')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'MTG_8P'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">8P MTG</span>
                    {getAssetsInZone('MTG_8P').length > 0 && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">8P Meeting</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">224 sq.ft</p>
                </button>
              </div>

              {/* CENTER MIDDLE ROW: TRAINING & MAIN SECURITY CONTROL */}
              <div className="col-span-6 grid grid-cols-3 gap-3.5 my-1.5">
                {/* Left Training Room */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('TRAINING_444')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'TRAINING_444'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-blue-700 uppercase tracking-widest font-bold">Training Left</span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">444 SFT</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1">
                    <span>Training Room</span>
                    {getAssetsInZone('TRAINING_444').length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">Capacity: 20 Active Desks</p>
                </button>

                {/* Main Security Center checkpoint entrance */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('SECURITY_GATE')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    selectedZoneId === 'SECURITY_GATE'
                      ? 'bg-blue-600 border-blue-700 text-white ring-4 ring-blue-500/20 shadow-md'
                      : 'bg-white border-blue-200 hover:border-blue-400 text-slate-900 shadow-2xs'
                  }`}
                >
                  <span className={`font-mono text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase mb-1 ${
                    selectedZoneId === 'SECURITY_GATE' ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-800'
                  }`}>Security Entry Gate</span>
                  <h4 className={`text-xs font-extrabold ${selectedZoneId === 'SECURITY_GATE' ? 'text-white' : 'text-slate-900'}`}>7TH FLOOR CHECKPOINT</h4>
                  <p className={`text-[10px] mt-1 font-semibold ${selectedZoneId === 'SECURITY_GATE' ? 'text-blue-100' : 'text-slate-500'}`}>Ready to Scan Hardware</p>
                </button>

                {/* Right Training Room */}
                <button
                  type="button"
                  onClick={() => setSelectedZoneId('TRAINING_461')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedZoneId === 'TRAINING_461'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-blue-700 uppercase tracking-widest font-bold">Training Right</span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">461 SFT</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1">
                    <span>Training Room</span>
                    {getAssetsInZone('TRAINING_461').length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">Capacity: 24 Active Desks</p>
                </button>
              </div>

              {/* BOTTOM HALF: THE WORKSTATION CLUSTERS */}
              <div className="col-span-6 grid grid-cols-5 gap-2.5">
                {/* Cluster Row A: Clusters 1, 2, 3, 4, 5 */}
                {[1, 2, 3, 4, 5].map(num => {
                  const id = `CLUSTER_${num}`;
                  const isSelected = selectedZoneId === id;
                  const zone = MAP_ZONES.find(z => z.id === id)!;
                  const zoneCpus = getAssetsInZone(id);
                  const incoming = getIncomingTicketsForZone(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedZoneId(id)}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between h-[100px] ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                          : incoming.length > 0
                          ? 'bg-amber-50 border-amber-400 animate-pulse shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">{id}</span>
                        
                        {incoming.length > 0 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400 animate-ping"></span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{zone.name}</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Workstations</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {zoneCpus.length > 0 ? (
                          <span className="bg-blue-100 border border-blue-200 text-blue-800 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {zoneCpus.length} CPU{zoneCpus.length > 1 ? 's' : ''} here
                          </span>
                        ) : incoming.length > 0 ? (
                          <span className="bg-amber-100 border border-amber-200 text-amber-900 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Incoming: {incoming.length}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 uppercase font-mono font-bold">EMPTY</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Cluster Row B: Clusters 6, 7, 8, 9, 10 */}
                {[6, 7, 8, 9, 10].map(num => {
                  const id = `CLUSTER_${num}`;
                  const isSelected = selectedZoneId === id;
                  const zone = MAP_ZONES.find(z => z.id === id)!;
                  const zoneCpus = getAssetsInZone(id);
                  const incoming = getIncomingTicketsForZone(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedZoneId(id)}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between h-[100px] ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                          : incoming.length > 0
                          ? 'bg-amber-50 border-amber-400 animate-pulse shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">{id}</span>
                        {incoming.length > 0 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400 animate-ping"></span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{zone.name}</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Workstations</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {zoneCpus.length > 0 ? (
                          <span className="bg-blue-100 border border-blue-200 text-blue-800 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {zoneCpus.length} CPU{zoneCpus.length > 1 ? 's' : ''} here
                          </span>
                        ) : incoming.length > 0 ? (
                          <span className="bg-amber-100 border border-amber-200 text-amber-900 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Incoming: {incoming.length}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 uppercase font-mono font-bold">EMPTY</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Cluster Row C: Clusters 11, 12, 13, 14, 15 */}
                {[11, 12, 13, 14, 15].map(num => {
                  const id = `CLUSTER_${num}`;
                  const isSelected = selectedZoneId === id;
                  const zone = MAP_ZONES.find(z => z.id === id)!;
                  const zoneCpus = getAssetsInZone(id);
                  const incoming = getIncomingTicketsForZone(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedZoneId(id)}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between h-[100px] ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                          : incoming.length > 0
                          ? 'bg-amber-50 border-amber-400 animate-pulse shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">{id}</span>
                        {incoming.length > 0 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400 animate-ping"></span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{zone.name}</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Workstations</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {zoneCpus.length > 0 ? (
                          <span className="bg-blue-100 border border-blue-200 text-blue-800 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            {zoneCpus.length} CPU{zoneCpus.length > 1 ? 's' : ''} here
                          </span>
                        ) : incoming.length > 0 ? (
                          <span className="bg-amber-100 border border-amber-200 text-amber-900 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Incoming: {incoming.length}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 uppercase font-mono font-bold">EMPTY</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Bottom Corridor Label */}
            <div className="text-[10px] font-mono text-blue-700/70 uppercase tracking-widest text-center mt-5 font-bold">
              LanTroVision Seventh Floor Asbuilt Numbering Layout Plan • Opt 1e
            </div>
          </div>
        </div>

        {/* Quick Instructions Footer */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2.5 bg-slate-50 rounded-xl p-3.5 border border-gray-200">
          <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="text-xs text-gray-600 leading-normal">
            💡 <strong>Interactive Control:</strong> Map zones interact with your <strong>Movement Tickets</strong>. When a CPU has an approved ticket destination of FLOOR_7, its target workstation cluster displays a blinking gold alert, tracking its physical transit corridor in real-time.
          </p>
        </div>
      </div>

      {/* 2. Interactive Custody Side panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5 flex flex-col justify-between" id="floor-7-side-panel">
        <div>
          {/* Selected Zone Header */}
          <div className="border-b border-gray-100 pb-3">
            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold font-mono px-2 py-0.5 uppercase tracking-wide">
              Selected Map Location
            </span>
            <h3 className="font-extrabold text-slate-900 text-lg mt-1 flex items-center gap-1.5">
              <span>{selectedZone.name}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-normal">{selectedZone.description}</p>
            {selectedZone.capacity && (
              <div className="mt-2 text-[11px] text-indigo-800 bg-indigo-50 font-semibold px-2 py-0.5 rounded-md w-fit">
                Capacity Limit: {selectedZone.capacity}
              </div>
            )}
          </div>

          {/* ASSETS CURRENTLY HERE */}
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-indigo-600" />
              <span>Current Custody (CPU Active)</span>
            </h4>

            {zoneAssets.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                <span className="text-xs text-gray-400 italic">No CPUs currently scanned here.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {zoneAssets.map(asset => (
                  <div key={asset.id} className="border border-indigo-100 bg-indigo-50/20 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded-lg">{asset.barcode}</span>
                      <span className="text-[10px] text-emerald-700 font-bold font-mono bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-gray-900">{asset.model}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{asset.serial_number}</div>
                    </div>
                    <button
                      onClick={() => onSelectBarcodeForScan(asset.barcode)}
                      className="mt-1 w-full text-center py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Audit / Verify Custody
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INCOMING TICKETS */}
          <div className="mt-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Incoming Transit Corridor</span>
            </h4>

            {zoneIncoming.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                <span className="text-xs text-gray-400 italic">No pending transits mapped to this zone.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {zoneIncoming.map(t => (
                  <div key={t.id} className="border border-amber-200 bg-amber-50/20 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/50 px-2 py-0.5 rounded-lg">{t.asset_barcode}</span>
                      {t.status === 'PENDING' ? (
                        <span className="text-[9px] text-amber-700 font-bold bg-amber-100 border border-amber-200 px-1.5 rounded-full">AWAITING APPR</span>
                      ) : (
                        <span className="text-[9px] text-indigo-700 font-bold bg-indigo-100 border border-indigo-200 px-1.5 rounded-full">APPROVED</span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-slate-600">
                      Custodian: <strong className="text-slate-800">{t.requested_by || t.requestor_name}</strong>
                    </p>

                    <div className="flex gap-1.5 mt-1">
                      {t.status === 'PENDING' ? (
                        <button
                          onClick={() => handleApproveTicketDirectly(t.id)}
                          className="flex-1 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] rounded-lg shadow-xs cursor-pointer transition-colors"
                        >
                          Approve Move
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectBarcodeForScan(t.asset_barcode);
                            onNavigateToTab('scanner');
                          }}
                          className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg shadow-xs cursor-pointer transition-colors"
                        >
                          Proceed to Scan Gate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* INITIATE NEW MOVEMENT TICKET */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          {!ticketFormOpen ? (
            <button
              onClick={() => setTicketFormOpen(true)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy CPU Here</span>
            </button>
          ) : (
            <form onSubmit={handleCreateMovementTicket} className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">New 7th Floor Move Ticket</span>
                <button
                  type="button"
                  onClick={() => {
                    setTicketFormOpen(false);
                    setMvtError('');
                    setMvtSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>

              {mvtSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg leading-relaxed font-semibold">
                  {mvtSuccess}
                </div>
              )}

              {mvtError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg leading-relaxed font-semibold">
                  {mvtError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Select CPU ID *
                </label>
                <select
                  required
                  value={selectedBarcodeToMove}
                  onChange={(e) => setSelectedBarcodeToMove(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Hardware --</option>
                  {availableCpus.map(cpu => (
                    <option key={cpu.id} value={cpu.barcode}>
                      {cpu.barcode} ({cpu.model}) - {cpu.current_location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Requestor Custodian *
                </label>
                <input
                  type="text"
                  required
                  value={newRequestor}
                  onChange={(e) => setNewRequestor(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingMvt}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {submittingMvt ? 'Generating Ticket...' : 'Initiate Secure Move'}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
