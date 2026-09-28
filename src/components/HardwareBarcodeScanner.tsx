import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, Cpu, Layers, CheckCircle2, AlertCircle, Trash2, Zap, Volume2, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { validateAndCleanSerial } from '../utils/serialValidator';

interface ScannedCpuItem {
  id: string;
  serialNumber: string;
  barcodeTag: string;
  timestamp: string;
}

interface HardwareBarcodeScannerProps {
  onSingleScan?: (serialOrBarcode: string) => void;
  onBulkScanSubmit?: (scannedItems: ScannedCpuItem[]) => void;
  onClose?: () => void;
  title?: string;
  defaultMode?: 'SINGLE' | 'BULK';
}

export default function HardwareBarcodeScanner({
  onSingleScan,
  onBulkScanSubmit,
  onClose,
  title = 'Hardware USB/Bluetooth Barcode Scanner',
  defaultMode = 'SINGLE',
}: HardwareBarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<'SINGLE' | 'BULK'>(defaultMode);
  const [inputVal, setInputVal] = useState('');
  const [bulkList, setBulkList] = useState<ScannedCpuItem[]>([]);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for hardware barcode gun
  useEffect(() => {
    inputRef.current?.focus();
  }, [scanMode]);

  const playBeep = (freq = 900, duration = 120) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio fallback
    }
  };

  const handleScanTrigger = (value: string) => {
    setErrorMsg(null);
    const valResult = validateAndCleanSerial(value);

    if (!valResult.isValid) {
      setErrorMsg(valResult.error || 'INVALID SCAN: Only clean CPU Serial Numbers are allowed to scan.');
      playBeep(350, 300);
      return;
    }

    const cleanSerial = valResult.cleanSerial;

    playBeep(1000, 100);
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 300);

    setLastScannedText(valResult.wasExtractedFromUrl ? `${cleanSerial} (Extracted from URL)` : cleanSerial);

    if (scanMode === 'SINGLE') {
      if (onSingleScan) {
        onSingleScan(cleanSerial);
      }
      setInputVal('');
    } else {
      // Bulk mode: check duplicate
      const isDup = bulkList.some(
        (item) => item.serialNumber === cleanSerial || item.barcodeTag === cleanSerial || item.barcodeTag === `CPU-${cleanSerial}`
      );

      if (isDup) {
        setErrorMsg(`DUPLICATE BLOCKED: Serial number "${cleanSerial}" is already in the batch list! CPU serial numbers must be strictly unique.`);
        playBeep(400, 300);
      } else {
        const newItem: ScannedCpuItem = {
          id: Math.random().toString(36).substring(2, 9),
          serialNumber: cleanSerial,
          barcodeTag: cleanSerial.startsWith('CPU') ? cleanSerial : `CPU-${cleanSerial}`,
          timestamp: new Date().toLocaleTimeString(),
        };
        // Enforce 1-by-1 sequential order (#1, #2, #3...)
        setBulkList((prev) => [...prev, newItem]);
      }
      setInputVal('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanTrigger(inputVal);
    }
  };

  const handleRemoveItem = (id: string) => {
    setBulkList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBulk = () => {
    setBulkList([]);
    setLastScannedText(null);
    setErrorMsg(null);
  };

  const handleFinalSubmitBulk = () => {
    if (bulkList.length === 0) return;
    if (onBulkScanSubmit) {
      onBulkScanSubmit(bulkList);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl border border-blue-200">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Hardware Scanner Ready
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Point USB or Wireless Hardware Barcode Reader at CPU serial tag & trigger scan
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setScanMode('SINGLE')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              scanMode === 'SINGLE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Single CPU Scan</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('BULK')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              scanMode === 'BULK'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bulk CPU Batch Mode ({bulkList.length})</span>
          </button>
        </div>

        {/* Hardware Input Box */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            flashSuccess
              ? 'bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100'
              : 'bg-slate-50 border-slate-200 focus-within:border-blue-500 focus-within:bg-white'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-mono font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Hardware Barcode Reader Active Target Input</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Press 'Enter' or trigger hardware barcode reader</span>
          </div>

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                scanMode === 'SINGLE'
                  ? 'Scan CPU barcode / serial tag with hardware barcode gun...'
                  : 'Continuously scan CPU barcodes into batch queue...'
              }
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono font-bold focus:outline-none placeholder-slate-400 pr-24 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => handleScanTrigger(inputVal)}
              disabled={!inputVal.trim()}
              className="absolute right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
            >
              Scan
            </button>
          </div>

          {errorMsg && (
            <div className="mt-2 text-xs text-rose-600 flex items-center space-x-1.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {lastScannedText && !errorMsg && (
            <div className="mt-2 text-xs text-emerald-700 flex items-center space-x-1.5 font-mono font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Scanned S/N: <strong className="text-slate-900 underline">{lastScannedText}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Bulk Scanned List Queue (if Bulk Mode) */}
        {scanMode === 'BULK' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span>Batch Scanned Queue</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono text-[10px]">
                  {bulkList.length} CPUs
                </span>
              </span>

              {bulkList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBulk}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Batch</span>
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
              {bulkList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-mono">
                  No CPUs scanned in bulk batch yet. Aim hardware barcode reader at CPU serial tags to scan continuously.
                </div>
              ) : (
                bulkList.map((item, index) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs font-mono hover:bg-white transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-700 font-bold w-7 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] text-center border border-blue-200">#{index + 1}</span>
                      <div>
                        <span className="text-slate-900 font-bold block">{item.serialNumber}</span>
                        <span className="text-[10px] text-blue-600">Barcode: {item.barcodeTag}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {bulkList.length > 0 && onBulkScanSubmit && (
              <button
                type="button"
                onClick={handleFinalSubmitBulk}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer mt-3"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Batch of {bulkList.length} CPUs</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
