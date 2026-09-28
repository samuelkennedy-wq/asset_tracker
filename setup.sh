#!/usr/bin/env bash

# Exit immediately on failure
set -eo pipefail

echo "=========================================================="
echo " Asset Chain of Custody Security System Installer (Linux) "
echo "=========================================================="
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 was not found in your environment."
    echo "Please install python3 using your local package manager."
    exit 1
fi

echo "[INFO] Instantiating Python virtual environment (.venv)..."
python3 -m venv .venv

echo "[INFO] Activating virtual environment..."
source .venv/bin/activate

echo "[INFO] Installing required dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "[INFO] Injecting default database seeds..."
python3 -c "
import sqlite3
conn = sqlite3.connect('asset.db')
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE NOT NULL,
    model TEXT,
    serial_number TEXT,
    current_location TEXT NOT NULL
)
''')
conn.commit()
print('[SUCCESS] Local asset.db created successfully.')
"

echo ""
echo "=========================================================="
echo " Installation completed successfully! "
echo " Execute 'source .venv/bin/activate' and run the app."
echo "=========================================================="
