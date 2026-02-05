@echo off
echo Closing Meeting Pilot...
taskkill /F /IM "Meeting Pilot.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Building...
call npm run build
if %errorlevel% neq 0 exit /b 1

echo Packaging...
call npm run electron:builder

echo Done! Run: release\win-unpacked\Meeting Pilot.exe
pause
