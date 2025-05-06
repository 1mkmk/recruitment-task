# run-backend-only.ps1
# Script to run just the backend server

$BackendPort = 8080

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
Write-Host "  JSONPlaceholder Posts Backend" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1
    Write-Host "Java is available" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Java is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Java to run the backend server." -ForegroundColor Red
    exit 1
}

# Check if the port is in use
if (Test-PortInUse -Port $BackendPort) {
    Write-Host "WARNING: Port $BackendPort is already in use." -ForegroundColor Yellow
    Write-Host "The backend server may not start properly." -ForegroundColor Yellow
    
    $killPort = Read-Host "Do you want to try to free this port? (y/n)"
    if ($killPort -eq 'y') {
        & ".\kill-port.ps1" $BackendPort
    }
}

# Start the backend server
Write-Host "Starting backend server on port $BackendPort..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Execute gradlew run
.\gradlew run --args="server" 