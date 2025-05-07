param (
    [Parameter(Mandatory=$false)]
    [int[]]$ports = @(8080),
    
    [Parameter(Mandatory=$false)]
    [switch]$list,
    
    [Parameter(Mandatory=$false)]
    [switch]$kill,
    
    [Parameter(Mandatory=$false)]
    [switch]$force,
    
    [Parameter(Mandatory=$false)]
    [switch]$checkAll
)

function Show-Banner {
    Clear-Host
    Write-Host "========================================"
    Write-Host "          MENEDZER PORTOW SIECIOWYCH"
    Write-Host "========================================"
    Write-Host ""
}

function Find-PortProcesses {
    param (
        [int]$port
    )
    
    $result = @{
        Port = $port
        Processes = @()
        IsInUse = $false
    }
    
    $processInfo = netstat -ano | Select-String ":$port "
    if (-not $processInfo) {
        return $result
    }
    
    $result.IsInUse = $true
    $pidList = @()
    
    foreach ($process in $processInfo) {
        $line = $process.ToString().Trim()
        $parts = $line -split '\s+'
        $processId = $parts[-1]
        $protocol = $parts[0]
        $localAddress = $parts[1]
        $foreignAddress = $parts[2]
        $state = if ($parts.Count -gt 4) { $parts[3] } else { "N/A" }
        
        if ($processId -match '^\d+$' -and -not ($pidList -contains $processId)) {
            $pidList += $processId
            
            try {
                $processObj = Get-Process -Id $processId -ErrorAction Stop
                $processName = $processObj.ProcessName
                $processPath = $processObj.Path
            } catch {
                $processName = "Nieznany"
                $processPath = "Nieznana"
            }
            
            $result.Processes += @{
                PID = $processId
                Protocol = $protocol
                LocalAddress = $localAddress
                ForeignAddress = $foreignAddress
                State = $state
                Name = $processName
                Path = $processPath
            }
        }
    }
    
    return $result
}

function List-AllUsedPorts {
    $uniquePorts = @{}
    
    $netstat = netstat -ano
    $regex = ':(\d+)\s+'
    
    foreach ($line in $netstat) {
        if ($line -match $regex) {
            $port = $matches[1]
            if (-not $uniquePorts.ContainsKey($port)) {
                $uniquePorts[$port] = 0
            }
            $uniquePorts[$port]++
        }
    }
    
    $portList = @()
    foreach ($port in $uniquePorts.Keys | Sort-Object { [int]$_ }) {
        $portList += [int]$port
    }
    
    return $portList
}

function Kill-Process {
    param (
        [int]$processId,
        [switch]$force
    )
    
    try {
        if ($force) {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } else {
            Stop-Process -Id $processId -ErrorAction Stop
        }
        return $true
    } catch {
        return $false
    }
}

# Glowna logika skryptu
Show-Banner

# Jesli flaga checkAll jest aktywna, sprawdz wszystkie uzywane porty
if ($checkAll) {
    Write-Host "Wyszukiwanie wszystkich uzywanych portow..."
    $ports = List-AllUsedPorts
    
    if ($ports.Count -eq 0) {
        Write-Host "Nie znaleziono zadnych uzywanych portow."
        exit 0
    }
    
    Write-Host "Znaleziono $($ports.Count) uzywanych portow: $($ports -join ', ')"
    
    if (-not $list -and -not $kill) {
        Write-Host "Uzyj parametru -list aby zobaczyc szczegoly lub -kill aby zakonczyc procesy."
        exit 0
    }
}

$results = @()
foreach ($port in $ports) {
    $portResult = Find-PortProcesses -port $port
    $results += $portResult
}

# Listowanie informacji o portach
if ($list -or -not $kill) {
    foreach ($result in $results) {
        if ($result.IsInUse) {
            Write-Host "Port $($result.Port): UZYWANY"
            Write-Host "Znaleziono $($result.Processes.Count) procesy:"
            
            foreach ($process in $result.Processes) {
                Write-Host "  PID: $($process.PID) | $($process.Protocol) | $($process.LocalAddress) | $($process.State) | $($process.Name)"
            }
        } else {
            Write-Host "Port $($result.Port): WOLNY"
        }
        Write-Host ""
    }
}

# Zabijanie procesow, jesli flaga kill jest aktywna
if ($kill) {
    $usedPorts = $results | Where-Object { $_.IsInUse }
    
    if ($usedPorts.Count -eq 0) {
        Write-Host "Nie znaleziono uzywanych portow do zwolnienia."
        exit 0
    }
    
    if (-not $force) {
        Write-Host "Nastepujace porty zostana zwolnione:"
        foreach ($portResult in $usedPorts) {
            Write-Host "  Port $($portResult.Port) - $($portResult.Processes.Count) procesy"
        }
        
        $confirmation = Read-Host "Czy chcesz kontynuowac? (t/n)"
        if ($confirmation -ne "t" -and $confirmation -ne "T") {
            Write-Host "Operacja anulowana."
            exit 0
        }
    }
    
    foreach ($portResult in $usedPorts) {
        Write-Host "Zwalnianie portu $($portResult.Port)..."
        
        foreach ($process in $portResult.Processes) {
            $success = Kill-Process -processId $process.PID -force:$force
            
            if ($success) {
                Write-Host "  Proces $($process.PID) ($($process.Name)) zostal pomyslnie zabity."
            } else {
                Write-Host "  Nie udalo sie zabic procesu $($process.PID) ($($process.Name))."
                Write-Host "  Sprobuj uruchomic skrypt jako administrator lub z parametrem -force."
            }
        }
        
        # Sprawdz czy port zostal zwolniony
        Start-Sleep -Seconds 1
        $checkAgain = Find-PortProcesses -port $portResult.Port
        
        if ($checkAgain.IsInUse) {
            Write-Host "Port $($portResult.Port) nadal jest uzywany!"
        } else {
            Write-Host "Port $($portResult.Port) zostal pomyslnie zwolniony."
        }
    }
}

# Instrukcja uzycia
if (-not $list -and -not $kill -and -not $checkAll -and $ports.Count -eq 1 -and $ports[0] -eq 8080) {
    Write-Host "Przyklady uzycia skryptu:"
    Write-Host "  .\manage-ports.ps1 -ports 8080,3000 -list            # Listuje procesy uzywajace portow 8080 i 3000"
    Write-Host "  .\manage-ports.ps1 -ports 8080 -kill                 # Zabija procesy uzywajace portu 8080"
    Write-Host "  .\manage-ports.ps1 -checkAll -list                   # Listuje wszystkie uzywane porty"
    Write-Host "  .\manage-ports.ps1 -ports 8080,3000 -kill -force     # Zabija procesy bez pytania o potwierdzenie"
} 