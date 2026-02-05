@echo off
set ELECTRON_RUN_AS_NODE=
echo Running with ELECTRON_RUN_AS_NODE=%ELECTRON_RUN_AS_NODE% (should be empty)
call npm run electron:dev
