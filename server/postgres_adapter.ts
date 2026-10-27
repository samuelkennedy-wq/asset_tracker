import { Pool } from 'pg';
import type { DatabaseState, Asset, MovementTicket, ScanLog, AppUser } from './database';

export interface PostgresStatus {
  connected: boolean;
  error?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  table_counts?: {
    assets: number;
    movement_tickets: number;
    gate_scan_logs: number;
    users: number;
  };
  last_sync?: string;
}

let pool: Pool | null = null;
let isConnected = false;
let lastError: string | undefined = undefined;
let lastSyncTime: string | undefined = undefined;

export function getPostgresConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: process.env.PGHOST || process.env.POSTGRES_HOST || '247ai-postgres-db',
    port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.PGUSER || process.env.POSTGRES_USER || 'asset_admin',
    password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'SecretAssetPass247!',
    database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'asset_tracker_db',
    connectionTimeoutMillis: 3000,
  };
}

export async function initPostgres(): Promise<boolean> {
  const config = getPostgresConfig();

  try {
    if (pool) {
      await pool.end().catch(() => {});
    }

    pool = new Pool({
      ...config,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    // Test connection with a fast query
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      isConnected = true;
      lastError = undefined;
      console.log('✅ [PostgreSQL] Connected successfully to database:', 'database' in config ? config.database : 'asset_tracker_db');
      
      // Ensure required tables & columns exist
      await ensurePostgresSchema(client);
    } finally {
      client.release();
    }

    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = err?.message || String(err);
    console.warn('⚠️ [PostgreSQL] Not connected or unreachable (falling back to atomic JSON database):', lastError);
    return false;
  }
}

async function ensurePostgresSchema(client: any): Promise<void> {
  try {
    // 1. Assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(255) UNIQUE NOT NULL,
        model VARCHAR(255),
        serial_number VARCHAR(255),
        asset_type VARCHAR(100),
        current_location VARCHAR(255),
        status VARCHAR(100),
        last_floor_ticket_no VARCHAR(100),
        last_floor_entered_at VARCHAR(100),
        last_floor VARCHAR(100),
        last_port_number VARCHAR(100),
        return_disposition VARCHAR(100),
        came_back_ticket_no VARCHAR(100),
        came_back_date VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Movement tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movement_tickets (
        id SERIAL PRIMARY KEY,
        ticket_no VARCHAR(100) UNIQUE,
        requestor_name VARCHAR(255),
        requestor_emp_id VARCHAR(100),
        engineer_name VARCHAR(255),
        engineer_emp_id VARCHAR(100),
        asset_type VARCHAR(100),
        asset_serial_number VARCHAR(255),
        asset_barcode VARCHAR(255),
        origin_location VARCHAR(255),
        destination_floor VARCHAR(255),
        target_room VARCHAR(255),
        port_number VARCHAR(100),
        reason TEXT,
        requested_by VARCHAR(255),
        status VARCHAR(100),
        approval_status VARCHAR(100),
        created_at VARCHAR(100),
        approved_at VARCHAR(100),
        clearance_id VARCHAR(100),
        approved_by_name VARCHAR(255),
        approved_by_id VARCHAR(100),
        rejection_reason TEXT,
        movement_type VARCHAR(100),
        return_disposition VARCHAR(100),
        previous_floor_ticket_no VARCHAR(100),
        previous_floor_entered_at VARCHAR(100),
        previous_floor VARCHAR(100),
        previous_port_number VARCHAR(100),
        went_in_ticket_no VARCHAR(100),
        went_in_date VARCHAR(100),
        came_back_ticket_no VARCHAR(100),
        came_back_date VARCHAR(100),
        is_backtracked_return BOOLEAN DEFAULT FALSE,
        gateway_clearance_status VARCHAR(100),
        gateway_blocked_reason TEXT,
        gateway_blocked_timestamp VARCHAR(100),
        gateway_cleared_timestamp VARCHAR(100),
        gateway_scanned_by VARCHAR(255)
      );
    `);

    // 3. Gate scan logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gate_scan_logs (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(255),
        ticket_no VARCHAR(100),
        clearance_id VARCHAR(100),
        is_valid INTEGER DEFAULT 1,
        message TEXT,
        status VARCHAR(100),
        location VARCHAR(255),
        destination VARCHAR(255),
        scanned_by VARCHAR(255),
        timestamp VARCHAR(100),
        asset_serial_number VARCHAR(255),
        movement_type VARCHAR(100),
        came_back_ticket_no VARCHAR(100),
        went_in_ticket_no VARCHAR(100)
      );
    `);

    // 4. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role_id VARCHAR(100),
        department VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        employee_id VARCHAR(100)
      );
    `);

    // Auto-migrate: Ensure all columns exist on pre-existing tables
    const columnMigrations = [
      // Assets table
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS model VARCHAR(255);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS current_location VARCHAR(255);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_floor_ticket_no VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_floor_entered_at VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_floor VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_port_number VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS return_disposition VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS came_back_ticket_no VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS came_back_date VARCHAR(100);`,
      `ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,

      // Movement tickets table
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS ticket_no VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS requestor_name VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS requestor_emp_id VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS engineer_name VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS engineer_emp_id VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS asset_type VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS asset_serial_number VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS asset_barcode VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS origin_location VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS destination_floor VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS target_room VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS port_number VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS reason TEXT;`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS status VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS approval_status VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS created_at VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS approved_at VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS clearance_id VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS approved_by_id VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS movement_type VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS return_disposition VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS previous_floor_ticket_no VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS previous_floor_entered_at VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS previous_floor VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS previous_port_number VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS went_in_ticket_no VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS went_in_date VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS came_back_ticket_no VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS came_back_date VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS is_backtracked_return BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS gateway_clearance_status VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS gateway_blocked_reason TEXT;`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS gateway_blocked_timestamp VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS gateway_cleared_timestamp VARCHAR(100);`,
      `ALTER TABLE movement_tickets ADD COLUMN IF NOT EXISTS gateway_scanned_by VARCHAR(255);`,

      // Gate scan logs table
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS ticket_no VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS clearance_id VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS is_valid INTEGER DEFAULT 1;`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS message TEXT;`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS status VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS location VARCHAR(255);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS destination VARCHAR(255);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS scanned_by VARCHAR(255);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS timestamp VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS asset_serial_number VARCHAR(255);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS movement_type VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS came_back_ticket_no VARCHAR(100);`,
      `ALTER TABLE gate_scan_logs ADD COLUMN IF NOT EXISTS went_in_ticket_no VARCHAR(100);`,

      // Users table
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR(100);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);`,

      // Constraints: ensure barcode is unique, drop redundant serial_number unique constraint
      `ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_serial_number_key;`
    ];

    for (const migration of columnMigrations) {
      await client.query(migration).catch((e: any) => {
        // Non-fatal if column or constraint exists
        console.debug('Migration step notice:', e?.message);
      });
    }
  } catch (err) {
    console.warn('Notice when verifying schema in Postgres:', err);
  }
}

export async function getPostgresStatus(): Promise<PostgresStatus> {
  const config = getPostgresConfig();
  const status: PostgresStatus = {
    connected: isConnected,
    error: lastError,
    host: 'host' in config ? config.host : '247ai-postgres-db',
    port: 'port' in config ? config.port : 5432,
    database: 'database' in config ? config.database : 'asset_tracker_db',
    user: 'user' in config ? config.user : 'asset_admin',
    last_sync: lastSyncTime,
  };

  if (!isConnected || !pool) {
    return status;
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          (SELECT count(*) FROM assets) AS total_assets,
          (SELECT count(*) FROM movement_tickets) AS total_tickets,
          (SELECT count(*) FROM gate_scan_logs) AS total_scan_logs,
          (SELECT count(*) FROM users) AS total_users;
      `);
      const row = res.rows[0];
      status.table_counts = {
        assets: parseInt(row.total_assets, 10) || 0,
        movement_tickets: parseInt(row.total_tickets, 10) || 0,
        gate_scan_logs: parseInt(row.total_scan_logs, 10) || 0,
        users: parseInt(row.total_users, 10) || 0,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    status.connected = false;
    status.error = err?.message || String(err);
  }

  return status;
}

/**
 * Bidirectional Sync:
 * Synchronizes records between JSON store and PostgreSQL.
 * If Postgres has records, it merges them into memoryDb.
 * Any missing records in Postgres are inserted.
 */
export async function syncDatabaseWithPostgres(memoryDb: DatabaseState): Promise<{ success: boolean; message: string; counts?: any }> {
  if (!pool || !isConnected) {
    const ok = await initPostgres();
    if (!ok) {
      return { success: false, message: 'PostgreSQL is not reachable at the moment. Working in persistent JSON file mode.' };
    }
  }

  const client = await pool!.connect();
  try {
    await client.query('BEGIN');

    // 0. Pull any existing records from PostgreSQL into memoryDb
    const existingPgAssets = await client.query('SELECT * FROM assets');
    for (const row of existingPgAssets.rows) {
      if (!row.barcode) continue;
      const found = memoryDb.assets.find(a => a.barcode?.toUpperCase().trim() === row.barcode.toUpperCase().trim());
      if (!found) {
        memoryDb.assets.push({
          id: row.id || (memoryDb.assets.length ? Math.max(...memoryDb.assets.map(a => a.id)) + 1 : 1),
          barcode: row.barcode,
          model: row.model || 'Standard Desktop CPU',
          serial_number: row.serial_number || `S/N-${row.barcode}`,
          asset_type: (row.asset_type as any) || 'CPU',
          current_location: row.current_location || 'IT Stock Room',
          status: (row.status as any) || 'AVAILABLE',
          last_floor_ticket_no: row.last_floor_ticket_no || undefined,
          last_floor_entered_at: row.last_floor_entered_at || undefined,
          last_floor: row.last_floor || undefined,
          last_port_number: row.last_port_number || undefined,
          return_disposition: row.return_disposition || undefined,
          came_back_ticket_no: row.came_back_ticket_no || undefined,
          came_back_date: row.came_back_date || undefined
        });
      }
    }

    const existingPgTickets = await client.query('SELECT * FROM movement_tickets');
    for (const row of existingPgTickets.rows) {
      const ticketNo = row.ticket_no || `TKT-${row.id}`;
      const found = memoryDb.movement_tickets.find(t => (t.ticket_no || `TKT-${t.id}`) === ticketNo);
      if (!found) {
        memoryDb.movement_tickets.push({
          id: row.id || (memoryDb.movement_tickets.length ? Math.max(...memoryDb.movement_tickets.map(t => t.id)) + 1 : 1),
          ticket_no: ticketNo,
          requestor_name: row.requestor_name || '',
          requestor_emp_id: row.requestor_emp_id || '',
          engineer_name: row.engineer_name || '',
          engineer_emp_id: row.engineer_emp_id || '',
          asset_type: row.asset_type || 'CPU',
          asset_serial_number: row.asset_serial_number || '',
          asset_barcode: row.asset_barcode || '',
          origin_location: row.origin_location || 'IT Stock Room',
          destination_floor: row.destination_floor || '',
          target_room: row.target_room || '',
          port_number: row.port_number || '',
          reason: row.reason || '',
          requested_by: row.requested_by || '',
          status: row.status || 'PENDING',
          approval_status: row.approval_status || 'PENDING',
          created_at: row.created_at || new Date().toISOString(),
          approved_at: row.approved_at || undefined,
          clearance_id: row.clearance_id || ticketNo,
          approved_by_name: row.approved_by_name || undefined,
          approved_by_id: row.approved_by_id || undefined,
          rejection_reason: row.rejection_reason || undefined,
          movement_type: row.movement_type || 'DEPLOY_TO_FLOOR',
          return_disposition: row.return_disposition || undefined,
          previous_floor_ticket_no: row.previous_floor_ticket_no || undefined,
          previous_floor_entered_at: row.previous_floor_entered_at || undefined,
          previous_floor: row.previous_floor || undefined,
          previous_port_number: row.previous_port_number || undefined,
          went_in_ticket_no: row.went_in_ticket_no || undefined,
          went_in_date: row.went_in_date || undefined,
          came_back_ticket_no: row.came_back_ticket_no || undefined,
          came_back_date: row.came_back_date || undefined,
          is_backtracked_return: !!row.is_backtracked_return,
          gateway_clearance_status: row.gateway_clearance_status || undefined,
          gateway_blocked_reason: row.gateway_blocked_reason || undefined,
          gateway_blocked_timestamp: row.gateway_blocked_timestamp || undefined,
          gateway_cleared_timestamp: row.gateway_cleared_timestamp || undefined,
          gateway_scanned_by: row.gateway_scanned_by || undefined
        });
      }
    }

    // 1. Sync Assets: Upsert from memoryDb to PostgreSQL
    for (const a of memoryDb.assets) {
      await client.query(`
        INSERT INTO assets (id, barcode, model, serial_number, asset_type, current_location, status,
                            last_floor_ticket_no, last_floor_entered_at, last_floor, last_port_number,
                            return_disposition, came_back_ticket_no, came_back_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (barcode) DO UPDATE SET
          model = EXCLUDED.model,
          serial_number = EXCLUDED.serial_number,
          asset_type = EXCLUDED.asset_type,
          current_location = EXCLUDED.current_location,
          status = EXCLUDED.status,
          last_floor_ticket_no = EXCLUDED.last_floor_ticket_no,
          last_floor_entered_at = EXCLUDED.last_floor_entered_at,
          last_floor = EXCLUDED.last_floor,
          last_port_number = EXCLUDED.last_port_number,
          return_disposition = EXCLUDED.return_disposition,
          came_back_ticket_no = EXCLUDED.came_back_ticket_no,
          came_back_date = EXCLUDED.came_back_date;
      `, [
        a.id, a.barcode, a.model || '', a.serial_number || '', a.asset_type || 'CPU',
        a.current_location || 'IT Storage', a.status || 'AVAILABLE',
        a.last_floor_ticket_no || null, a.last_floor_entered_at || null, a.last_floor || null,
        a.last_port_number || null, a.return_disposition || null,
        a.came_back_ticket_no || null, a.came_back_date || null
      ]);
    }

    // 2. Sync Movement Tickets
    for (const t of memoryDb.movement_tickets) {
      const ticketNo = t.ticket_no || `TKT-${t.id}`;
      await client.query(`
        INSERT INTO movement_tickets (
          ticket_no, requestor_name, requestor_emp_id, engineer_name, engineer_emp_id,
          asset_type, asset_serial_number, asset_barcode, origin_location, destination_floor,
          target_room, port_number, reason, requested_by, status, approval_status,
          created_at, approved_at, clearance_id, approved_by_name, approved_by_id,
          rejection_reason, movement_type, return_disposition, previous_floor_ticket_no,
          previous_floor_entered_at, previous_floor, previous_port_number, went_in_ticket_no,
          went_in_date, came_back_ticket_no, came_back_date, is_backtracked_return,
          gateway_clearance_status, gateway_blocked_reason, gateway_blocked_timestamp,
          gateway_cleared_timestamp, gateway_scanned_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        )
        ON CONFLICT (ticket_no) DO UPDATE SET
          status = EXCLUDED.status,
          approval_status = EXCLUDED.approval_status,
          approved_at = EXCLUDED.approved_at,
          clearance_id = EXCLUDED.clearance_id,
          approved_by_name = EXCLUDED.approved_by_name,
          gateway_clearance_status = EXCLUDED.gateway_clearance_status,
          gateway_cleared_timestamp = EXCLUDED.gateway_cleared_timestamp,
          gateway_blocked_timestamp = EXCLUDED.gateway_blocked_timestamp;
      `, [
        ticketNo, t.requestor_name || '', t.requestor_emp_id || '', t.engineer_name || '', t.engineer_emp_id || '',
        t.asset_type || '', t.asset_serial_number || '', t.asset_barcode || '', t.origin_location || '', t.destination_floor || '',
        t.target_room || '', t.port_number || '', t.reason || '', t.requested_by || '', t.status || 'PENDING', t.approval_status || 'PENDING',
        t.created_at || new Date().toISOString(), t.approved_at || null, t.clearance_id || null, t.approved_by_name || null, t.approved_by_id || null,
        t.rejection_reason || null, t.movement_type || 'DEPLOY_TO_FLOOR', t.return_disposition || null, t.previous_floor_ticket_no || null,
        t.previous_floor_entered_at || null, t.previous_floor || null, t.previous_port_number || null, t.went_in_ticket_no || null,
        t.went_in_date || null, t.came_back_ticket_no || null, t.came_back_date || null, !!t.is_backtracked_return,
        t.gateway_clearance_status || null, t.gateway_blocked_reason || null, t.gateway_blocked_timestamp || null,
        t.gateway_cleared_timestamp || null, t.gateway_scanned_by || null
      ]);
    }

    // 3. Sync Users
    for (const u of (memoryDb.users || [])) {
      await client.query(`
        INSERT INTO users (id, name, email, role_id, department, is_active, employee_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role_id = EXCLUDED.role_id,
          department = EXCLUDED.department,
          is_active = EXCLUDED.is_active;
      `, [
        u.id, u.name, u.email || '', u.role_id || '', u.department || '', u.active ?? true, (u as any).emp_id || (u as any).employee_id || ''
      ]);
    }

    await client.query('COMMIT');
    lastSyncTime = new Date().toISOString();
    return { 
      success: true, 
      message: 'Bidirectional sync complete: assets, tickets, and users merged with PostgreSQL.',
      counts: {
        total_assets: memoryDb.assets.length,
        total_tickets: memoryDb.movement_tickets.length,
        total_users: (memoryDb.users || []).length
      }
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error during PostgreSQL synchronization:', err);
    return { success: false, message: `Sync failed: ${err.message}` };
  } finally {
    client.release();
  }
}
