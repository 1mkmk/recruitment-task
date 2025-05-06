# JSONPlaceholder Posts Downloader - Start Script
# This script helps run both the backend server and frontend app
# Author: maciejkasik.net

$BackendPort = 8080
$FrontendPort = 5173
$BackendLogFile = "$PSScriptRoot\backend.log"
$FrontendLogFile = "$PSScriptRoot\frontend.log"

# Function to check if a port is in use
function Test-PortInUse {
    param(
        [int]$Port
    )
    try {
        $null = New-Object System.Net.Sockets.TcpClient -ArgumentList 'localhost', $Port
        return $true
    } catch {
        return $false
    }
}

# Clear the screen and show header
Clear-Host
Write-Host "========================================"
Write-Host "  JSONPlaceholder Posts Downloader" -ForegroundColor Cyan
Write-Host "  Start Script" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Check if the ports are in use
$backendInUse = Test-PortInUse -Port $BackendPort
$frontendInUse = Test-PortInUse -Port $FrontendPort

if ($backendInUse) {
    Write-Host "ERROR: Port $BackendPort is already in use." -ForegroundColor Red
    Write-Host "       The backend server cannot start." -ForegroundColor Red
    Write-Host "       Run .\kill-port.ps1 $BackendPort to free the port." -ForegroundColor Yellow
    exit 1
}

if ($frontendInUse) {
    Write-Host "ERROR: Port $FrontendPort is already in use." -ForegroundColor Red
    Write-Host "       The frontend app cannot start." -ForegroundColor Red
    Write-Host "       Run .\kill-port.ps1 $FrontendPort to free the port." -ForegroundColor Yellow
    exit 1
}

# Start backend server
Write-Host "Starting backend server on port $BackendPort..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$PSScriptRoot'; .\gradlew run --args='server' > $BackendLogFile`"" -WindowStyle Hidden

# Wait a bit for the backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend app
Write-Host "Starting frontend app on port $FrontendPort..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$PSScriptRoot\frontend2'; yarn dev > $FrontendLogFile`"" -WindowStyle Hidden

# Show information
Write-Host ""
Write-Host "Applications started:" -ForegroundColor Cyan
Write-Host "  * Backend server: http://localhost:$BackendPort"
Write-Host "  * Frontend app:   http://localhost:$FrontendPort"
Write-Host ""
Write-Host "Logs available at:" -ForegroundColor Cyan
Write-Host "  * Backend: $BackendLogFile"
Write-Host "  * Frontend: $FrontendLogFile"
Write-Host ""
Write-Host "To stop the applications, press Ctrl+C in their console windows or use the task manager."
Write-Host "Alternatively, you can run: .\kill-port.ps1 $BackendPort $FrontendPort"
Write-Host "" 