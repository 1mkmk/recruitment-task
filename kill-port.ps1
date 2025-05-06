# kill-port.ps1
# Script to kill a process using a specific port
# Usage: .\kill-port.ps1 8080 5173

param(
    [Parameter(Position=0, Mandatory=$false)]
    [int[]] $Ports = @()
)

# Function to kill process using a specific port
function Kill-Process-On-Port {
    param(
        [int] $Port
    )
    
    Write-Host "Checking port $Port..." -ForegroundColor Cyan
    
    try {
        # Find the process ID using the specified port
        $processInfo = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        
        if ($null -eq $processInfo) {
            Write-Host "No process found using port $Port" -ForegroundColor Yellow
            return $false
        }
        
        $processId = $processInfo.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($null -eq $process) {
            Write-Host "Could not find process with ID $processId" -ForegroundColor Yellow
            return $false
        }
        
        # Display process information
        Write-Host "Found process using port $($Port)" -ForegroundColor Green
        Write-Host "  Process ID: $processId" -ForegroundColor White
        Write-Host "  Process Name: $($process.ProcessName)" -ForegroundColor White
        
        # Kill the process
        $process | Stop-Process -Force
        Write-Host "Process killed successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Error killing process on port $Port : $_" -ForegroundColor Red
        return $false
    }
}

# If no ports specified, show help
if ($Ports.Count -eq 0) {
    Write-Host "Usage: .\kill-port.ps1 <port1> [port2] [port3] ..." -ForegroundColor Yellow
    Write-Host "Example: .\kill-port.ps1 8080 5173" -ForegroundColor Yellow
    
    # Ask the user if they want to kill common ports
    $killCommon = Read-Host "Do you want to kill common ports (8080, 5173)? (y/n)"
    
    if ($killCommon -eq 'y') {
        $Ports = @(8080, 5173)
    } else {
        exit 0
    }
}

# Kill processes on each port
foreach ($port in $Ports) {
    $result = Kill-Process-On-Port -Port $port
    
    if ($result) {
        Write-Host "Successfully killed process on port $port" -ForegroundColor Green
    } else {
        Write-Host "No process was killed on port $port" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "Port killing operation completed" -ForegroundColor Cyan 