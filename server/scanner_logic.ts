import { loadDb, saveDb, logSystem } from './database';

export interface ScanResult {
  isValid: boolean;
  result: 'APPROVED' | 'BLOCKED';
  message: string;
  fromLocation: string;
  toLocation: string;
}

/**
 * Validates custody transition rules:
 * 1. STOCK <-> IT_ROOM (Valid)
 * 2. IT_ROOM <-> FLOOR_X (Valid)
 * 3. STOCK -> FLOOR_X (Blocked)
 * 4. FLOOR_X -> STOCK (Blocked)
 * 5. FLOOR_A -> FLOOR_B (Blocked)
 * Also enforces Duplicate Serial Number prevention.
 */
export function validateTransition(scannedInput: string, toLocation: string): ScanResult {
  const db = loadDb();
  const cleanInput = scannedInput.toUpperCase().trim();

  // Match asset by barcode OR serial_number
  const asset = db.assets.find(
    a => a.barcode.toUpperCase().trim() === cleanInput ||
         a.serial_number.toUpperCase().trim() === cleanInput
  );

  if (!asset) {
    return {
      isValid: false,
      result: 'BLOCKED',
      message: `STOP - CPU serial number / barcode '${scannedInput}' is not registered in IT Stock Room inventory.`,
      fromLocation: 'UNKNOWN',
      toLocation: toLocation
    };
  }

  // Duplicate scan check: Check if exact same asset was scanned within the last 10 seconds
  const recentLogs = db.scan_logs.filter(
    s => (s.barcode.toUpperCase().trim() === asset.barcode.toUpperCase().trim() ||
          s.barcode.toUpperCase().trim() === asset.serial_number.toUpperCase().trim())
  );

  if (recentLogs.length > 0) {
    const lastScan = recentLogs[recentLogs.length - 1];
    const timeDiffMs = Date.now() - new Date(lastScan.scan_timestamp).getTime();
    
    // Block duplicate scans within 10 seconds or duplicate scan at same destination without movement
    if (timeDiffMs < 10000 && lastScan.to_location === toLocation) {
      return {
        isValid: false,
        result: 'BLOCKED',
        message: `DUPLICATE SERIAL SCAN REJECTED! Serial number '${asset.serial_number}' (${asset.barcode}) was already scanned at ${toLocation} ${Math.round(timeDiffMs / 1000)}s ago. Duplicate barcodes cannot be re-scanned.`,
        fromLocation: asset.current_location,
        toLocation: toLocation
      };
    }
  }

  const fromLoc = asset.current_location.toUpperCase().trim();
  const toLoc = toLocation.toUpperCase().trim();

  // If scanning at the current location (and not a rapid duplicate)
  if (fromLoc === toLoc) {
    return {
      isValid: true,
      result: 'APPROVED',
      message: `Serial number '${asset.serial_number}' verified at ${toLoc}. Asset custody confirmed.`,
      fromLocation: fromLoc,
      toLocation: toLoc
    };
  }

  let allowed = false;

  if (fromLoc === 'STOCK') {
    // Stock can only transition to IT_ROOM
    allowed = (toLoc === 'IT_ROOM');
  } else if (fromLoc === 'IT_ROOM') {
    // IT Room can transition back to STOCK or out to any FLOOR
    allowed = (toLoc === 'STOCK' || toLoc.startsWith('FLOOR'));
  } else if (fromLoc.startsWith('FLOOR')) {
    // Floors can only transition back to IT_ROOM
    allowed = (toLoc === 'IT_ROOM');
  }

  if (allowed) {
    return {
      isValid: true,
      result: 'APPROVED',
      message: `Proceed - Authorized IT Stock Room custody transition pathway (${fromLoc} ➜ ${toLoc}).`,
      fromLocation: fromLoc,
      toLocation: toLoc
    };
  } else {
    return {
      isValid: false,
      result: 'BLOCKED',
      message: `STOP - UNAUTHORIZED MOVEMENT! Attempted direct path: ${fromLoc} ──x──> ${toLoc}. Must transition through IT Stock Room gate.`,
      fromLocation: fromLoc,
      toLocation: toLoc
    };
  }
}

/**
 * Executes a scan, logs it, updates the asset location if approved,
 * and updates movement tickets if applicable.
 */
export function executeScan(scannedInput: string, toLocation: string, guard: string): ScanResult {
  const db = loadDb();
  const cleanInput = scannedInput.toUpperCase().trim();
  const result = validateTransition(scannedInput, toLocation);

  const scanId = db.scan_logs.length ? Math.max(...db.scan_logs.map(s => s.id)) + 1 : 1;
  
  // Find asset to log primary barcode
  const asset = db.assets.find(
    a => a.barcode.toUpperCase().trim() === cleanInput ||
         a.serial_number.toUpperCase().trim() === cleanInput
  );

  const barcodeToLog = asset ? asset.barcode : scannedInput;

  // Log the scan
  db.scan_logs.push({
    id: scanId,
    barcode: barcodeToLog,
    scanned_by: guard || 'IT Stock Gate Security',
    from_location: result.fromLocation,
    to_location: toLocation,
    scan_timestamp: new Date().toISOString(),
    is_valid: result.isValid ? 1 : 0,
    reason: result.message
  });

  if (result.isValid && asset) {
    // Update asset current location
    asset.current_location = toLocation;

    // Check if there is an approved movement ticket to this floor
    if (toLocation.startsWith('FLOOR')) {
      const ticket = db.movement_tickets.find(
        t => (t.asset_barcode.toUpperCase().trim() === asset.barcode.toUpperCase().trim() ||
              t.asset_barcode.toUpperCase().trim() === asset.serial_number.toUpperCase().trim()) &&
             t.destination_floor.toUpperCase().trim() === toLocation.toUpperCase().trim() &&
             t.status === 'APPROVED'
      );
      if (ticket) {
        ticket.status = 'APPROVED';
      }
    }

    logSystem('SUCCESS', `Asset ${asset.barcode} (S/N: ${asset.serial_number}) moved from ${result.fromLocation} to ${toLocation} (Verified by ${guard || 'Gate Guard'})`);
  } else {
    logSystem('ERROR', `BLOCKED: Attempted scan for ${scannedInput} from ${result.fromLocation} to ${toLocation}. Reason: ${result.message}`);
  }

  saveDb();
  return result;
}

