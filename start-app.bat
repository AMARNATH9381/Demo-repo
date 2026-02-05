@echo off
echo Starting Meeting Pilot Application...
echo.

REM Start backend server
echo [1/2] Starting backend server on port 3001...
start "Backend Server" cmd /k "cd backend && npm start"

REM Wait for backend to initialize
timeout /t 3 /nobreak > nul

REM Start frontend
echo [2/2] Starting frontend on port 3000...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Meeting Pilot is starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to stop all services...
pause > nul

REM Kill all node processes (cleanup)
taskkill /F /IM node.exe /T > nul 2>&1
echo Services stopped.
