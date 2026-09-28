export interface Asset {
  id: number;
  asset_type?: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Laptop' | 'Printer' | 'Server' | 'Other';
  barcode: string;
  model: string;
  serial_number: string;
  current_location: string;
  location?: string;
  status?: 'AVAILABLE' | 'IN_TRANSIT' | 'DEPLOYED' | 'DEPLOYED_ON_FLOOR' | 'MAINTENANCE' | 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
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
  ticket_no?: string; // e.g. TKT-0001
  requestor_name: string;
  requested_by?: string; // compatibility alias
  requestor_emp_id: string;
  engineer_name: string;
  engineer_emp_id: string;
  asset_type?: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Laptop' | 'Printer' | 'Server' | 'Other' | string;
  asset_serial_number: string;
  asset_barcode: string;
  origin_location: string;
  destination_floor: string; // Floor 1-9, Floor 12, IT_ROOM
  target_room?: string;
  port_number?: string; // Network switch / desk data port on destination floor (e.g. SW03-P18, Port 24)
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  clearance_id?: string; // Movement identification (strictly the Ticket Number e.g. TKT-0001, RET-2026-0001; no ticket tags created)
  approved_by_name?: string;
  approved_by_id?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  movement_type?: 'DEPLOY_TO_FLOOR' | 'RETURN_TO_IT_ROOM';
  return_disposition?: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  previous_floor_ticket_no?: string; // Ticket number when it was entered inside the floor (Went In Ticket)
  previous_floor_entered_at?: string; // Timestamp when it was entered inside the floor (Went In Date)
  previous_floor?: string; // Floor from which it returned
  previous_port_number?: string; // Switch port from which it returned
  went_in_ticket_no?: string; // Alias for explicit backtracking
  went_in_date?: string;
  came_back_ticket_no?: string; // Ticket number when it came back to stock room
  came_back_date?: string;
  is_backtracked_return?: boolean;
  gateway_clearance_status?: 'CLEARED' | 'BLOCKED' | 'HOLD' | 'DENIED' | 'RESOLVED';
  gateway_blocked_reason?: string;
  gateway_blocked_timestamp?: string;
  gateway_cleared_timestamp?: string;
  gateway_scanned_by?: string;
  scanned_physical_serial?: string;
}

export interface GateScanLog {
  id: number;
  barcode: string;
  serial_number?: string;
  ticket_id?: number;
  ticket_no?: string;
  scan_result: 'CLEARED' | 'HOLD' | 'DENIED';
  scanned_by: string;
  scanned_at: string;
  from_location: string;
  to_location: string;
  reason: string;
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

export interface ScanLog {
  id: number;
  barcode: string;
  scanned_by: string;
  from_location: string;
  to_location: string;
  scan_timestamp: string;
  is_valid: number; // 0 or 1
  reason?: string;
  went_in_ticket_no?: string;
  came_back_ticket_no?: string;
  return_disposition?: 'BACK_TO_STOCK' | 'BACK_TO_SCRAP';
  clearance_id?: string;
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
  id: string; // e.g. 'module_a_engineer', 'module_b_manager', 'module_c_security', 'role_auditor', etc.
  name: string; // e.g. 'IT Field Engineer', 'Approval Manager', 'Gate Security Clearance', 'IT Auditor', 'System Administrator'
  code: string; // e.g. 'IT_ENG', 'MGR_APP', 'SEC_OFF', 'IT_AUDIT', 'SYS_ADM'
  description: string;
  department: string;
  badge_color: string; // e.g. 'blue', 'amber', 'indigo', 'emerald', 'purple'
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

export interface Employee {
  id: number;
  name: string;
  employee_id: string;
  role: 'IT Engineer' | 'Approval Manager' | 'Gate Security' | 'Admin' | 'Employee';
  department: string;
  active: boolean;
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

export interface DashboardStats {
  totalAssets: number;
  pendingTickets: number;
  approvedTickets?: number;
  rejectedTickets?: number;
  validScansCount: number;
  blockedScansCount: number;
  queuedEmailsCount: number;
}
