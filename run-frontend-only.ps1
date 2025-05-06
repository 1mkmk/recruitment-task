# run-frontend-only.ps1
# Script to run just the frontend React application

$FrontendPort = 5173
$FrontendDir = "frontend2"

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
Write-Host "  JSONPlaceholder Posts Frontend" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Check if the frontend directory exists
if (-not (Test-Path -Path $FrontendDir)) {
    Write-Host "ERROR: Frontend directory '$FrontendDir' not found." -ForegroundColor Red
    exit 1
}

# Change to the frontend directory
Set-Location -Path $FrontendDir

# Check if yarn is installed
try {
    $yarnVersion = yarn --version
    Write-Host "Yarn is available: $yarnVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Yarn is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Yarn to run the frontend application." -ForegroundColor Red
    exit 1
}

# Check if the port is in use
if (Test-PortInUse -Port $FrontendPort) {
    Write-Host "WARNING: Port $FrontendPort is already in use." -ForegroundColor Yellow
    Write-Host "The frontend application may not start properly." -ForegroundColor Yellow
    
    $killPort = Read-Host "Do you want to try to free this port? (y/n)"
    if ($killPort -eq 'y') {
        # Go back to the root directory to run the kill-port script
        Set-Location -Path ..
        & ".\kill-port.ps1" $FrontendPort
        # Go back to the frontend directory
        Set-Location -Path $FrontendDir
    }
}

# Start the frontend application
Write-Host "Starting frontend application on port $FrontendPort..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
Write-Host ""

# Execute yarn dev
yarn dev 