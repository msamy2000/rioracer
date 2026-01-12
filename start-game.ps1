$ErrorActionPreference = "Stop"

try {
    # Simple script to start a local web server for RioRacer
    Write-Host "Starting RioRacer Local Server..." -ForegroundColor Cyan
    Write-Host "This resolves CORS issues with ES6 Modules."
    Write-Host "Press Ctrl+C to stop the server."
    Write-Host ""

    # Try Python 3
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "Found Python. Launching server at http://localhost:8000" -ForegroundColor Green
        Start-Process "http://localhost:8000"
        python -m http.server 8000
    } 
    # Fallback to Python 2 (unlikely but possible)
    elseif (Get-Command python2 -ErrorAction SilentlyContinue) {
        Write-Host "Found Python 2. Launching server..." -ForegroundColor Green
        Start-Process "http://localhost:8000"
        python2 -m SimpleHTTPServer 8000
    }
    # Fallback to Node (http-server)
    elseif (Get-Command npx -ErrorAction SilentlyContinue) {
        Write-Host "Found Node.js. Using http-server..." -ForegroundColor Green
        # npx requires shell to be interactive sometimes, or we can just run it.
        # We will try running it directly.
        npx http-server . -o
    }
    else {
        Write-Error "Could not find Python or Node.js. Please install one of them to run a local server."
    }
}
catch {
    Write-Host ""
    Write-Host "An error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "TIP: If the error says 'running scripts is disabled', run this command in PowerShell and try again:" -ForegroundColor Yellow
    Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
}
finally {
    Write-Host ""
    Read-Host "Press Enter to exit..."
}
