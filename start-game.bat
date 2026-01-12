@echo off
TITLE RioRacer Local Server
CLS
ECHO Starting RioRacer Local Server...
ECHO This resolves CORS issues with ES6 Modules.
ECHO.

:: Check for Python
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO Found Python. Launching server...
    start http://localhost:8000
    python -m http.server 8000
    GOTO END
)

:: Check for Node/NPX
call npx --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO Found Node.js. Using http-server...
    call npx http-server . -o
    GOTO END
)

:: Error handling
COLOR 0C
ECHO.
ECHO [ERROR] Could not find Python or Node.js.
ECHO Please install Python (https://www.python.org/) or Node.js (https://nodejs.org/).
ECHO.
PAUSE
EXIT /B

:END
ECHO.
ECHO Server stopped.
PAUSE
