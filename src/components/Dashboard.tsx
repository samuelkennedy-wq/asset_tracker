import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, DashboardStats, MovementTicket } from '../types';
import { Shield, Plus, Database, Landmark, Layers, HelpCircle, Laptop, ArrowRight, MapPin } from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
  tickets: MovementTicket[];
  stats: DashboardStats;
  onRefresh: () => void;
  onSelectBarcodeForScan: (barcode: string) => void;
}

export default function Dashboard({ assets, tickets, stats, onRefresh, onSelectBarcodeForScan }: DashboardProps) {
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [currentLocation, setCurrentLocation] = useState('STOCK');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!barcode.trim()) {
      setRegisterError('Barcode is required.');
      return;
    }

    try {
      const res = await fetch('/api/assets/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: barcode.toUpperCase().trim(),
          model: model.trim() || undefined,
          serial_number: serialNumber.trim() || undefined,
          current_location: currentLocation
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed.');
      } else {
        setRegisterSuccess(`Successfully registered CPU ${data.asset.barcode}!`);
        setBarcode('');
        setModel('');
        setSerialNumber('');
        setCurrentLocation('STOCK');
        onRefresh();
        setTimeout(() => setRegisterSuccess(''), 4000);
      }
    } catch (err) {
      setRegisterError('Network error registering asset.');
    }
  };

  const getStatusBadge = (loc: string) => {
    const format = loc.toUpperCase();
    if (format === 'STOCK') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">STOCK Depot</span>;
    } else if (format === 'IT_ROOM') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">IT Room Gate</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">{format}</span>;
    }
  };

  return (
    <div className="space-y-6" id="dashboard-section">
      {/* KPI stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" id="stats-grid">
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow-md"
        >
          <div className="p-2 bg-slate-50 text-slate-700 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total CPUs</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalAssets}</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow-md"
        >
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Moves</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.pendingTickets}</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow-md"
        >
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Scans</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.validScansCount}</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow-md"
        >
          <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked Scans</p>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{stats.blockedScansCount}</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 col-span-2 md:col-span-1 transition-shadow hover:shadow-md"
        >
          <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Queue</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">
              {stats.queuedEmailsCount}
              <span className="text-xs font-normal text-gray-400 ml-1">waiting</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Custody Pathway Diagrams */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm" id="pathway-diagram">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5 mb-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Chain of Custody Enforcement Pathway</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {/* Approved Path */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Authorized Pathway
            </span>
            <div className="flex items-center justify-around mt-4 text-xs font-bold">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 border border-amber-300 mx-auto">STOCK</div>
                <p className="text-[10px] text-slate-500 mt-1">Storage</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 border border-blue-300 mx-auto">IT ROOM</div>
                <p className="text-[10px] text-slate-500 mt-1">Security Check</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 border border-emerald-300 mx-auto">FLOOR</div>
                <p className="text-[10px] text-slate-500 mt-1">Workstations</p>
              </div>
            </div>
          </div>

          {/* Blocked Path */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Bypassed Pathway (Blocked)
            </span>
            <div className="flex items-center justify-center space-x-4 mt-4 text-xs font-bold">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 border border-amber-300 mx-auto">STOCK</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 mb-0.5">UNAUTHORIZED</span>
                <div className="h-0.5 w-20 bg-rose-400 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-rose-600 font-bold text-sm">✕</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 border border-emerald-300 mx-auto">FLOOR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Asset View & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="assets-panel">
        {/* Asset Directory */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-slate-700" />
              <span>CPU Asset Directory</span>
            </h3>
            <button
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Register CPU
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                <tr>
                  <th className="px-5 py-3">Barcode ID</th>
                  <th className="px-5 py-3">System Model</th>
                  <th className="px-5 py-3">Serial Number</th>
                  <th className="px-5 py-3">Current Location</th>
                  <th className="px-5 py-3">Scheduled Destination Floor</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                      No CPU assets registered. Click 'Register CPU' to seed one.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => {
                    const activeTicket = tickets.find(
                      t => t.asset_barcode.toUpperCase().trim() === asset.barcode.toUpperCase().trim() &&
                           (t.status === 'PENDING' || t.status === 'APPROVED')
                    );

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-bold text-indigo-700">{asset.barcode}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{asset.model}</td>
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">{asset.serial_number}</td>
                        <td className="px-5 py-3">{getStatusBadge(asset.current_location)}</td>
                        <td className="px-5 py-3">
                          {activeTicket ? (
                            activeTicket.status === 'PENDING' ? (
                              <div className="flex flex-col space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg w-fit">
                                  <Layers className="w-3 h-3 text-amber-500 animate-pulse" />
                                  {activeTicket.destination_floor}
                                </span>
                                {activeTicket.target_room && (
                                  <span className="text-[11px] text-gray-500 font-medium">
                                    📍 {activeTicket.target_room}
                                  </span>
                                )}
                                <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Awaiting Guard Approval</span>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg w-fit">
                                  <ArrowRight className="w-3 h-3 text-indigo-500" />
                                  {activeTicket.destination_floor}
                                </span>
                                {activeTicket.target_room && (
                                  <span className="text-[11px] text-indigo-900 font-medium bg-indigo-50/50 rounded px-1 w-fit">
                                    📍 {activeTicket.target_room}
                                  </span>
                                )}
                                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Approved - Ready to Scan</span>
                              </div>
                            )
                          ) : asset.current_location.startsWith('FLOOR') ? (
                            <span className="text-xs text-emerald-700 font-medium">Deployed here</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No active transit ticket</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => onSelectBarcodeForScan(asset.barcode)}
                            className="text-xs text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md font-medium transition-colors"
                          >
                            Scan Barcode
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

        {/* Register Asset Side Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-fit">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-3 mb-4">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Register Secure CPU</span>
          </h3>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Asset Barcode ID *
              </label>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. CPU90006"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Processor / System Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Dell OptiPlex 7090"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Manufacturer Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. S/N-78F8A2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Initial Custody Location
              </label>
              <select
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="STOCK">STOCK Depot</option>
                <option value="IT_ROOM">IT_ROOM Checkpoint</option>
                <option value="FLOOR_1">FLOOR_1 Workstation</option>
                <option value="FLOOR_2">FLOOR_2 Workstation</option>
                <option value="FLOOR_3">FLOOR_3 Workstation</option>
              </select>
            </div>

            <AnimatePresence>
              {registerError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg"
                >
                  ⚠️ {registerError}
                </motion.div>
              )}

              {registerSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg"
                >
                  ✓ {registerSuccess}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Add Asset to Database
            </motion.button>
          </form>

          <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              <strong>Zebra Scanner Info:</strong> When printing barcode labels, encode standard alphanumeric formats (Code 128 / QR). Scanners act as keyboard emulators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
