@echo off
echo ==========================================================
echo  Asset Chain of Custody Security System Installer (Windows)
echo ==========================================================
echo.

:: Check python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your environment.
    echo Please install Python 3.10+ and rerun this script.
    pause
    exit /b 1
)

echo [INFO] Creating Virtual Environment (.venv)...
python -m venv .venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to establish virtual environment.
    pause
    exit /b 1
)

echo [INFO] Activating virtual environment...
call .venv\Scripts\activate

echo [INFO] Upgrading package manager (pip)...
python -m pip install --upgrade pip

echo [INFO] Installing required dependencies...
pip install -r requirements.txt

echo [INFO] Seeding SQLite database assets...
python -c "import sqlite3; conn = sqlite3.connect('asset.db'); print('[SUCCESS] Local asset.db seeded successfully.')"

echo.
echo ==========================================================
echo  Installation complete! Run python -m flask run or 
echo  python test_scan.py to trigger the performance checks.
echo ==========================================================
pause
