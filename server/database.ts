import * as fs from 'fs';
import * as path from 'path';

export interface Asset {
  id: number;
  asset_type?: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Laptop' | 'Printer' | 'Server' | 'Other';
  barcode: string;
  model: string;
  serial_number: string;
  current_location: string;
  status?: 'AVAILABLE' | 'IN_TRANSIT' | 'DEPLOYED' | 'MAINTENANCE' | 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  last_floor_ticket_no?: string;
  last_floor_entered_at?: string;
  last_floor?: string;
  last_port_number?: string;
  return_disposition?: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  came_back_ticket_no?: string;
  came_back_date?: string;
}

export interface MovementTicket {
  id: number;
  ticket_no?: string;
  requestor_name?: string;
  requestor_emp_id?: string;
  engineer_name?: string;
  engineer_emp_id?: string;
  asset_type?: string;
  asset_serial_number?: string;
  asset_barcode: string;
  origin_location: string;
  destination_floor: string;
  target_room?: string;
  port_number?: string;
  reason?: string;
  requested_by?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at?: string;
  clearance_id?: string;
  approved_by_name?: string;
  approved_by_id?: string;
  rejection_reason?: string;
  movement_type?: 'DEPLOY_TO_FLOOR' | 'RETURN_TO_IT_ROOM';
  return_disposition?: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  previous_floor_ticket_no?: string;
  previous_floor_entered_at?: string;
  previous_floor?: string;
  previous_port_number?: string;
  went_in_ticket_no?: string;
  went_in_date?: string;
  came_back_ticket_no?: string;
  came_back_date?: string;
  is_backtracked_return?: boolean;
  gateway_clearance_status?: 'CLEARED' | 'BLOCKED' | 'HOLD' | 'DENIED' | 'RESOLVED';
  gateway_blocked_reason?: string;
  gateway_blocked_timestamp?: string;
  gateway_cleared_timestamp?: string;
  gateway_scanned_by?: string;
  scanned_physical_serial?: string;
}

export interface ScanLog {
  id: number;
  barcode: string;
  serial_number?: string;
  ticket_id?: number;
  ticket_no?: string;
  scanned_by: string;
  from_location: string;
  to_location: string;
  scan_timestamp: string;
  is_valid: number; // 0 or 1
  reason?: string;
  clearance_id?: string;
  went_in_ticket_no?: string;
  went_in_date?: string;
  went_in_floor?: string;
  went_in_port?: string;
  came_back_ticket_no?: string;
  came_back_date?: string;
  return_disposition?: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  is_backtracked_return?: boolean;
  engineer_name?: string;
  engineer_emp_id?: string;
  approver_name?: string;
}

export interface EmailQueue {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  created_at: string;
  sent_at?: string;
}

export interface SystemLog {
  id: number;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

export interface RolePermissions {
  can_create_movement_tickets: boolean;
  can_edit_tickets: boolean;
  can_approve_tickets: boolean;
  can_reject_tickets: boolean;
  can_gate_scan: boolean;
  can_view_floor_map: boolean;
  can_view_asset_directory: boolean;
  can_export_reports: boolean;
  can_access_server_terminal: boolean;
  can_manage_roles: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  code: string;
  description: string;
  department: string;
  badge_color: string;
  permissions: RolePermissions;
  is_system_default?: boolean;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  emp_id: string;
  role_id: string;
  department: string;
  active: boolean;
  created_at?: string;
}

export interface DatabaseState {
  assets: Asset[];
  movement_tickets: MovementTicket[];
  scan_logs: ScanLog[];
  email_queue: EmailQueue[];
  system_logs: SystemLog[];
  roles: UserRole[];
  users: AppUser[];
  is_internet_online: boolean;
}

const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'module_a_engineer',
    name: 'IT Field Engineer',
    code: 'IT_ENG',
    description: 'Field engineer responsible for creating CPU movement requests, mapping assets, and managing inventory.',
    department: 'IT Field Services',
    badge_color: 'blue',
    is_system_default: true,
    permissions: {
      can_create_movement_tickets: true,
      can_edit_tickets: true,
      can_approve_tickets: false,
      can_reject_tickets: false,
      can_gate_scan: false,
      can_view_floor_map: true,
      can_view_asset_directory: true,
      can_export_reports: false,
      can_access_server_terminal: false,
      can_manage_roles: false
    }
  },
  {
    id: 'module_b_manager',
    name: 'IT Approval Manager',
    code: 'MGR_APP',
    description: 'Executive IT manager with full authority to approve/reject movement passes, issue security clearances, and manage user roles.',
    department: 'IT Operations & Governance',
    badge_color: 'amber',
    is_system_default: true,
    permissions: {
      can_create_movement_tickets: true,
      can_edit_tickets: true,
      can_approve_tickets: true,
      can_reject_tickets: true,
      can_gate_scan: true,
      can_view_floor_map: true,
      can_view_asset_directory: true,
      can_export_reports: true,
      can_access_server_terminal: true,
      can_manage_roles: true
    }
  },
  {
    id: 'module_c_security',
    name: 'Gate Security Officer',
    code: 'SEC_OFF',
    description: 'Physical perimeter security guard authorized to perform barcode scans, verify clearance passes, and monitor exit gates.',
    department: 'Facilities & Security',
    badge_color: 'indigo',
    is_system_default: true,
    permissions: {
      can_create_movement_tickets: false,
      can_edit_tickets: false,
      can_approve_tickets: false,
      can_reject_tickets: false,
      can_gate_scan: true,
      can_view_floor_map: false,
      can_view_asset_directory: true,
      can_export_reports: true,
      can_access_server_terminal: true,
      can_manage_roles: false
    }
  },
  {
    id: 'role_auditor',
    name: 'IT Compliance Auditor',
    code: 'IT_AUDIT',
    description: 'Read-only compliance auditor with access to inventory master reports, gate scan logs, and email queue trails.',
    department: 'Internal Audit',
    badge_color: 'purple',
    is_system_default: true,
    permissions: {
      can_create_movement_tickets: false,
      can_edit_tickets: false,
      can_approve_tickets: false,
      can_reject_tickets: false,
      can_gate_scan: false,
      can_view_floor_map: true,
      can_view_asset_directory: true,
      can_export_reports: true,
      can_access_server_terminal: true,
      can_manage_roles: false
    }
  },
  {
    id: 'role_sys_admin',
    name: 'System Administrator',
    code: 'SYS_ADM',
    description: 'Super-user with unrestricted root control over asset management, security protocols, server terminals, and user role creation.',
    department: 'IT Infrastructure',
    badge_color: 'emerald',
    is_system_default: true,
    permissions: {
      can_create_movement_tickets: true,
      can_edit_tickets: true,
      can_approve_tickets: true,
      can_reject_tickets: true,
      can_gate_scan: true,
      can_view_floor_map: true,
      can_view_asset_directory: true,
      can_export_reports: true,
      can_access_server_terminal: true,
      can_manage_roles: true
    }
  }
];

const DEFAULT_USERS: AppUser[] = [
  {
    id: 1,
    name: 'Dominic Manoharan',
    email: 'dominic.manoharan@247.ai',
    emp_id: '010128793',
    role_id: 'module_b_manager',
    department: 'IT Governance',
    active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 6,
    name: 'Jyothi Potula',
    email: 'jyothi.potula@247.ai',
    emp_id: 'jyothi.potula',
    role_id: 'module_b_manager',
    department: 'IT Asset Governance & Approvals',
    active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: 2,
    name: 'Samuel Kennedy',
    email: 'engineer@247.ai',
    emp_id: '01099318',
    role_id: 'module_a_engineer',
    department: 'IT Field Services',
    active: true,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 3,
    name: 'Platina Security Officer',
    email: 'platina.security@247.ai',
    emp_id: '01088412',
    role_id: 'module_c_security',
    department: 'Facilities Security',
    active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 4,
    name: 'Basavaraj SK',
    email: 'basavaraj.sk@247.ai',
    emp_id: '01099318',
    role_id: 'module_a_engineer',
    department: 'IT Support',
    active: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 5,
    name: 'Sarah Connor',
    email: 'sarah.auditor@247.ai',
    emp_id: '01077221',
    role_id: 'role_auditor',
    department: 'Internal Audit',
    active: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

const INITIAL_STATE: DatabaseState = {
  roles: DEFAULT_ROLES,
  users: DEFAULT_USERS,
  assets: [
    { id: 1, barcode: 'CPU90001', model: 'Dell OptiPlex 7090', serial_number: 'S/N-78F8A2', current_location: 'STOCK', status: 'AVAILABLE' },
    { id: 2, barcode: 'CPU90002', model: 'HP EliteDesk 800 G6', serial_number: 'S/N-H92G4K', current_location: 'IT_ROOM', status: 'IN_TRANSIT' },
    { id: 3, barcode: 'CPU90003', model: 'Lenovo ThinkCentre M90q', serial_number: 'S/N-L34D9W', current_location: 'FLOOR_3', status: 'DEPLOYED' },
    { id: 4, barcode: 'CPU90004', model: 'Dell OptiPlex 5080', serial_number: 'S/N-92C2X4', current_location: 'STOCK', status: 'AVAILABLE' },
    { id: 5, barcode: 'CPU90005', model: 'HP ProDesk 600 G5', serial_number: 'S/N-H38S9L', current_location: 'FLOOR_1', status: 'DEPLOYED' },
    { id: 6, barcode: 'CPU90006', model: 'Dell OptiPlex 7090 Plus', serial_number: 'S/N-DL77F5', current_location: 'FLOOR_7', status: 'DEPLOYED' },
    { id: 7, barcode: 'CPU90007', model: 'Lenovo ThinkCentre M90q Gen2', serial_number: 'S/N-LN77F4', current_location: 'FLOOR_7', status: 'DEPLOYED' }
  ],
  movement_tickets: [
    {
      id: 1,
      ticket_no: 'TKT-0001',
      asset_barcode: 'CPU90002',
      asset_serial_number: 'S/N-H92G4K',
      origin_location: 'IT_ROOM',
      destination_floor: 'FLOOR_3',
      target_room: 'Finance Desk 304',
      port_number: 'SW03-P18',
      requestor_name: 'Samuel Kennedy',
      requested_by: 'Samuel Kennedy',
      engineer_name: 'Basavaraj SK',
      engineer_emp_id: '01099318',
      reason: 'Workstation upgrade for Finance team',
      status: 'PENDING',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      ticket_no: 'TKT-0002',
      asset_barcode: 'CPU90003',
      asset_serial_number: 'S/N-L34D9W',
      origin_location: 'IT_ROOM',
      destination_floor: 'FLOOR_3',
      target_room: 'Executive Suite 310',
      port_number: 'SW03-P24',
      requestor_name: 'Alice Chen',
      requested_by: 'Alice Chen',
      engineer_name: 'T Murugesh',
      engineer_emp_id: '010125496',
      reason: 'New system setup for executive suite',
      status: 'APPROVED',
      clearance_id: 'TKT-0002',
      approved_by_name: 'D. Manoharan',
      approved_by_id: '010128793',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      approved_at: new Date(Date.now() - 7100000).toISOString()
    },
    {
      id: 3,
      ticket_no: 'TKT-0003',
      asset_barcode: 'CPU90006',
      asset_serial_number: 'S/N-DL77F5',
      origin_location: 'IT_ROOM',
      destination_floor: 'FLOOR_7',
      target_room: 'Training Room (444)',
      requestor_name: 'Officer John Doe',
      requested_by: 'Officer John Doe',
      engineer_name: 'Mahantesh',
      engineer_emp_id: '01005651',
      reason: '7th floor office expansion',
      status: 'APPROVED',
      clearance_id: 'TKT-0003',
      approved_by_name: 'D. Manoharan',
      approved_by_id: '010128793',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      approved_at: new Date(Date.now() - 14300000).toISOString()
    },
    {
      id: 4,
      ticket_no: 'TKT-0004',
      asset_barcode: 'CPU90007',
      asset_serial_number: 'S/N-LN77F4',
      origin_location: 'IT_ROOM',
      destination_floor: 'FLOOR_7',
      target_room: 'Cluster 3',
      requestor_name: 'Samuel Kennedy',
      requested_by: 'Samuel Kennedy',
      engineer_name: 'Basavaraj SK',
      engineer_emp_id: '01099318',
      reason: 'Development lab replacement',
      status: 'APPROVED',
      clearance_id: 'TKT-0004',
      approved_by_name: 'D. Manoharan',
      approved_by_id: '010128793',
      gateway_clearance_status: 'BLOCKED',
      gateway_blocked_reason: "SECURITY ALERT: SERIAL NUMBERS MISMATCH AT GATE! Registered IT Room S/N: 'S/N-LN77F4' vs Scanned Physical CPU S/N: 'CPU-88912'. Gate Officer blocked entry/exit.",
      gateway_blocked_timestamp: new Date(Date.now() - 1800000).toISOString(),
      gateway_scanned_by: 'Gate Security Officer-01',
      scanned_physical_serial: 'CPU-88912',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      approved_at: new Date(Date.now() - 14300000).toISOString()
    }
  ],
  scan_logs: [
    {
      id: 1,
      barcode: 'CPU90003',
      scanned_by: 'Officer Guard 1',
      from_location: 'STOCK',
      to_location: 'IT_ROOM',
      scan_timestamp: new Date(Date.now() - 10800000).toISOString(),
      is_valid: 1
    },
    {
      id: 2,
      barcode: 'CPU90003',
      scanned_by: 'Officer Guard 1',
      from_location: 'IT_ROOM',
      to_location: 'FLOOR_3',
      scan_timestamp: new Date(Date.now() - 10500000).toISOString(),
      is_valid: 1
    }
  ],
  email_queue: [
    {
      id: 1,
      recipient: 'amg@247.ai',
      subject: 'CPU90003 Authorized Movement Logged',
      body: 'INFO: CPU90003 successfully scanned from IT_ROOM to FLOOR_3. Scanned by Officer Guard 1.',
      status: 'SENT',
      created_at: new Date(Date.now() - 10500000).toISOString(),
      sent_at: new Date(Date.now() - 10490000).toISOString()
    }
  ],
  system_logs: [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'System initiated. Asset Chain of Custody tracking active.'
    }
  ],
  is_internet_online: true
};

let memoryDb: DatabaseState | null = null;

export function consolidateDuplicateTickets(state: DatabaseState): boolean {
  if (!state.movement_tickets || state.movement_tickets.length <= 1) return false;

  let changed = false;
  const mergedMap = new Map<string, MovementTicket>();
  const newTickets: MovementTicket[] = [];

  for (const t of state.movement_tickets) {
    const ticketNo = (t.ticket_no || '').trim().toUpperCase();
    if (!ticketNo) {
      newTickets.push(t);
      continue;
    }

    if (mergedMap.has(ticketNo)) {
      changed = true;
      const existing = mergedMap.get(ticketNo)!;

      const existingSerials = (existing.asset_serial_number || '').split(',').map(s => s.trim()).filter(Boolean);
      const addSerials = (t.asset_serial_number || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const s of addSerials) {
        if (!existingSerials.includes(s)) existingSerials.push(s);
      }
      existing.asset_serial_number = existingSerials.join(', ');

      const existingBarcodes = (existing.asset_barcode || '').split(',').map(s => s.trim()).filter(Boolean);
      const addBarcodes = (t.asset_barcode || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const b of addBarcodes) {
        if (!existingBarcodes.includes(b)) existingBarcodes.push(b);
      }
      existing.asset_barcode = existingBarcodes.join(', ');

      if (!existing.requestor_emp_id && t.requestor_emp_id) existing.requestor_emp_id = t.requestor_emp_id;
      if (!existing.engineer_emp_id && t.engineer_emp_id) existing.engineer_emp_id = t.engineer_emp_id;
    } else {
      mergedMap.set(ticketNo, t);
      newTickets.push(t);
    }
  }

  if (changed) {
    state.movement_tickets = newTickets;
  }
  return changed;
}

function enforceTicketNumberIdentification(state: DatabaseState): boolean {
  let changed = false;
  if (state.movement_tickets) {
    for (const t of state.movement_tickets) {
      if ((t as any).clearance_id && ((t as any).clearance_id.startsWith('CLR-') || (t as any).clearance_id.startsWith('TAG-'))) {
        (t as any).clearance_id = t.ticket_no || `TKT-${t.id}`;
        changed = true;
      }
    }
  }
  if (state.scan_logs) {
    for (const s of state.scan_logs) {
      if ((s as any).clearance_id && ((s as any).clearance_id.startsWith('CLR-') || (s as any).clearance_id.startsWith('TAG-'))) {
        (s as any).clearance_id = (s as any).came_back_ticket_no || s.ticket_no || (s as any).went_in_ticket_no || 'TKT-0001';
        changed = true;
      }
    }
  }
  return changed;
}

export function loadDb(): DatabaseState {
  if (memoryDb) {
    let needsSave = consolidateDuplicateTickets(memoryDb);
    if (enforceTicketNumberIdentification(memoryDb)) {
      needsSave = true;
    }
    if (needsSave) {
      saveDb();
    }
    return memoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      memoryDb = JSON.parse(raw);
      if (!memoryDb!.system_logs) memoryDb!.system_logs = [];
      if (!memoryDb!.roles || memoryDb!.roles.length === 0) memoryDb!.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
      if (!memoryDb!.users || memoryDb!.users.length === 0) memoryDb!.users = JSON.parse(JSON.stringify(DEFAULT_USERS));
      if (memoryDb!.is_internet_online === undefined) memoryDb!.is_internet_online = true;

      let needsSave = consolidateDuplicateTickets(memoryDb!);
      if (enforceTicketNumberIdentification(memoryDb!)) {
        needsSave = true;
      }
      if (needsSave) {
        saveDb();
      }
      return memoryDb!;
    }
  } catch (err) {
    console.error('Error reading database file, using fallback INITIAL_STATE:', err);
  }

  memoryDb = JSON.parse(JSON.stringify(INITIAL_STATE));
  consolidateDuplicateTickets(memoryDb!);
  enforceTicketNumberIdentification(memoryDb!);
  saveDb();
  return memoryDb!;
}

export function saveDb(): void {
  if (!memoryDb) return;
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

export function resetDb(): DatabaseState {
  memoryDb = JSON.parse(JSON.stringify(INITIAL_STATE));
  memoryDb.system_logs.push({
    id: memoryDb.system_logs.length + 1,
    timestamp: new Date().toISOString(),
    level: 'SUCCESS',
    message: 'Database reset to default demo data.'
  });
  saveDb();
  return memoryDb;
}

export function logSystem(level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string) {
  const db = loadDb();
  const id = db.system_logs.length ? Math.max(...db.system_logs.map(l => l.id)) + 1 : 1;
  db.system_logs.push({
    id,
    timestamp: new Date().toISOString(),
    level,
    message
  });
  if (db.system_logs.length > 300) {
    db.system_logs.shift();
  }
  saveDb();
}
