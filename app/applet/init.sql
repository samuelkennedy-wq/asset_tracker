-- ==============================================================================
-- [24]7.ai Asset Tracking & Gate Security Clearance System - PostgreSQL Schema
-- Database: asset_tracker_db
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    emp_id VARCHAR(50) UNIQUE NOT NULL,
    role_id VARCHAR(50) NOT NULL CHECK (role_id IN ('module_a_engineer', 'module_b_manager', 'module_c_security')),
    department VARCHAR(100) DEFAULT 'IT Field Services',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. HARDWARE ASSETS INVENTORY TABLE
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(150) NOT NULL,
    origin_location VARCHAR(100) DEFAULT 'IT_ROOM Stock Room',
    current_location VARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_TRANSIT', 'DEPLOYED', 'MAINTENANCE', 'SCRAPPED')),
    assigned_engineer VARCHAR(150),
    last_floor_ticket_no VARCHAR(100),
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. MOVEMENT TICKETS TABLE (CHAIN OF CUSTODY)
CREATE TABLE IF NOT EXISTS movement_tickets (
    id SERIAL PRIMARY KEY,
    ticket_no VARCHAR(50) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    asset_serial_number VARCHAR(100) NOT NULL,
    asset_barcode VARCHAR(100) NOT NULL,
    asset_type VARCHAR(50) DEFAULT 'CPU',
    origin_location VARCHAR(100) NOT NULL DEFAULT 'IT_ROOM',
    destination_floor VARCHAR(100) NOT NULL,
    target_room VARCHAR(100),
    port_number VARCHAR(50),
    requestor_name VARCHAR(150) NOT NULL,
    requestor_emp_id VARCHAR(50) NOT NULL,
    engineer_name VARCHAR(150) NOT NULL,
    engineer_emp_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) DEFAULT 'DEPLOY_TO_FLOOR' CHECK (movement_type IN ('DEPLOY_TO_FLOOR', 'RETURN_TO_IT_ROOM')),
    return_disposition VARCHAR(50) CHECK (return_disposition IN ('BACK_TO_STOCK', 'BACK_TO_SCRAP')),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CLEARED')),
    approved_by_name VARCHAR(150),
    approved_by_id VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    clearance_id VARCHAR(100),
    gateway_clearance_status VARCHAR(50) DEFAULT 'PENDING' CHECK (gateway_clearance_status IN ('PENDING', 'CLEARED', 'BLOCKED', 'DENIED')),
    gateway_blocked_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PLATINA GATE SECURITY SCAN LOGS TABLE
CREATE TABLE IF NOT EXISTS gate_scan_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES movement_tickets(id) ON DELETE SET NULL,
    ticket_no VARCHAR(50),
    barcode VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    scan_result VARCHAR(50) NOT NULL CHECK (scan_result IN ('CLEARED', 'HOLD', 'DENIED', 'REJECTED')),
    scanned_by VARCHAR(150) NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    reason TEXT,
    clearance_id VARCHAR(100),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR SUB-MILLISECOND LOOKUPS
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_no ON movement_tickets(ticket_no);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON movement_tickets(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_serial ON gate_scan_logs(serial_number);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Seed Primary Users
INSERT INTO users (name, email, emp_id, role_id, department) VALUES
('Dominic Manoharan', 'dominic.manoharan@247.ai', 'dominic.manoharan@247.ai', 'module_b_manager', 'IT Infrastructure Governance'),
('Jyothi Potula', 'jyothi.potula@247.ai', 'jyothi.potula', 'module_b_manager', 'Senior IT Approver'),
('Basavaraj SK', 'engineer@247.ai', '01099318', 'module_a_engineer', 'IT Field Services'),
('Platina Security Officer', 'platina.security@247.ai', 'platina.security@247.ai', 'module_c_security', 'Corporate Facility Security')
ON CONFLICT (email) DO NOTHING;

-- Seed Sample Hardware Assets
INSERT INTO assets (barcode, serial_number, model, origin_location, current_location, status) VALUES
('CPU90001', 'S/N-H92G4K', 'Dell OptiPlex 7090 Micro', 'IT_ROOM Stock Room', 'Floor 3 - Finance Bay', 'DEPLOYED'),
('CPU90002', 'S/N-78F8A2', 'HP EliteDesk 800 G6', 'IT_ROOM Stock Room', 'Floor 7 - Workstation 704', 'DEPLOYED'),
('CPU90003', 'S/N-L34D9W', 'Lenovo ThinkCentre M70q', 'IT_ROOM Stock Room', 'IT_ROOM Stock Room', 'AVAILABLE')
ON CONFLICT (serial_number) DO NOTHING;

-- Seed Sample Movement Ticket
INSERT INTO movement_tickets (
    ticket_no, asset_serial_number, asset_barcode, asset_type,
    origin_location, destination_floor, target_room, port_number,
    requestor_name, requestor_emp_id, engineer_name, engineer_emp_id,
    reason, status, approved_by_name, approved_by_id, approved_at, clearance_id
) VALUES (
    'IT012346', 'S/N-H92G4K', 'CPU90001', 'CPU',
    'IT Room', 'Floor 3', 'Finance Room 304', 'SW03-P18',
    'SAMUEL KENNEDY', '01099234', 'Basavaraj SK', '01099318',
    'Workstation upgrade for Financial Analytics team',
    'APPROVED', 'Dominic Manoharan', 'dominic.manoharan@247.ai', CURRENT_TIMESTAMP, 'IT012346'
) ON CONFLICT (ticket_no) DO NOTHING;
