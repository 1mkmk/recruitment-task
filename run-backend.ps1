# Run-Backend.ps1 - Script to run the backend server
# Created for JSONPlaceholder Post Downloader application

# Function to check if a port is already in use
function Test-PortInUse {
    param (
        [int]$Port
    )
    
    $connections = Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port -and $_.State -eq "Listen" }
    return ($null -ne $connections)
}

# Configuration
$backendPort = 8080

# Check if port is already in use
if (Test-PortInUse -Port $backendPort) {
    Write-Host "WARNING: Port $backendPort is already in use." -ForegroundColor Yellow
    $confirmation = Read-Host "Do you want to try to free the port? (y/n)"
    
    if ($confirmation -eq 'y') {
        # Attempt to run the kill-port script if it exists
        if (Test-Path "$PSScriptRoot\kill-port.ps1") {
            & "$PSScriptRoot\kill-port.ps1" $backendPort
        } else {
            Write-Host "ERROR: kill-port.ps1 script not found!" -ForegroundColor Red
        }
    }
}

Write-Host "Starting backend server..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Directory: $PSScriptRoot" -ForegroundColor Green
Write-Host "Running: .\gradlew run --args='server'" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Run the backend server
.\gradlew run --args="server" 