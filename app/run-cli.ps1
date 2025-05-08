#!/usr/bin/env pwsh

# Skrypt do uruchamiania aplikacji w trybie CLI
$jarPath = ".\build\libs\jsonplaceholder-downloader-1.0-SNAPSHOT.jar"

if (-not (Test-Path $jarPath)) {
    Write-Host "Budowanie aplikacji..." -ForegroundColor Yellow
    & .\gradlew build -x test
}

# Funkcja wyswietlajaca pomoc
function Show-Help {
    Write-Host "`nDostepne komendy:" -ForegroundColor Cyan
    Write-Host "  posts                     - Pobierz i wyswietl wszystkie posty"
    Write-Host "  posts <id>                - Pobierz i wyswietl post o podanym ID"
    Write-Host "  save <id>                 - Zapisz post o podanym ID"
    Write-Host "  save-all                  - Zapisz wszystkie posty"
    Write-Host "  save-all-with-relations   - Zapisz wszystkie posty z relacjami"
    Write-Host "  saved-posts               - Wyswietl liste zapisanych postow"
    Write-Host "  delete <id>               - Usun zapisany post o podanym ID"
    Write-Host "  clear                     - Usun wszystkie zapisane posty"
    Write-Host "  quick-refresh             - Szybkie odswiezenie danych"
    Write-Host "  hard-refresh              - Pelne odswiezenie wszystkich danych"
    Write-Host "  filter --minId <id>       - Filtruj posty z ID >= minId"
    Write-Host "  filter --maxId <id>       - Filtruj posty z ID <= maxId"
    Write-Host "  filter --title <tekst>    - Filtruj posty zawierajace tekst w tytule"
    Write-Host "  filter --body <tekst>     - Filtruj posty zawierajace tekst w tresci"
    Write-Host "  filter --date <data>      - Filtruj posty pobrane po dacie (format: yyyy-MM-ddTHH:mm:ss)"
    Write-Host "  export-zip [id1 id2 ...]  - Eksportuj wszystkie lub wybrane posty do ZIP"
    Write-Host "  toggle-relations [on|off] - Przelacz tryb pobierania z relacjami"
    Write-Host "  help                      - Wyswietl te pomoc"
    Write-Host "`nPrzyklad: .\run-cli.ps1 posts 5" -ForegroundColor Yellow
}

# Mapowanie argumentow na parametry
$command = $args[0]
$additionalArgs = $args[1..($args.Length-1)]

# Dodajemy v2 jako pierwszy argument, aby używać nowego trybu CLI dla wszystkich komend
$cliArgs = @("v2")

switch ($command) {
    "posts" {
        if ($additionalArgs.Length -gt 0) {
            $cliArgs += @("posts", $additionalArgs[0])
        }
        else {
            $cliArgs += @("posts")
        }
    }
    "save" {
        if ($additionalArgs.Length -gt 0) {
            $cliArgs += @("save", $additionalArgs[0])
        }
        else {
            Write-Host "Blad: Komenda 'save' wymaga podania ID posta" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
    "save-all" {
        $cliArgs += @("save-all")
    }
    "save-all-with-relations" {
        $cliArgs += @("save-all-with-relations")
    }
    "saved-posts" {
        $cliArgs += @("saved-posts")
    }
    "delete" {
        if ($additionalArgs.Length -gt 0) {
            $cliArgs += @("delete", $additionalArgs[0])
        }
        else {
            Write-Host "Blad: Komenda 'delete' wymaga podania ID posta" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
    "clear" {
        $cliArgs += @("clear")
    }
    "quick-refresh" {
        $cliArgs += @("quick-refresh")
    }
    "hard-refresh" {
        $cliArgs += @("hard-refresh")
    }
    "filter" {
        $filterArgs = @("filter")
        $i = 0
        while ($i -lt $additionalArgs.Length) {
            if ($additionalArgs[$i] -eq "--minId" -and $i+1 -lt $additionalArgs.Length) {
                $filterArgs += "--min-id"
                $filterArgs += $additionalArgs[$i+1]
                $i += 2
            }
            elseif ($additionalArgs[$i] -eq "--maxId" -and $i+1 -lt $additionalArgs.Length) {
                $filterArgs += "--max-id"
                $filterArgs += $additionalArgs[$i+1]
                $i += 2
            }
            elseif ($additionalArgs[$i] -eq "--title" -and $i+1 -lt $additionalArgs.Length) {
                $filterArgs += "--title"
                $filterArgs += $additionalArgs[$i+1]
                $i += 2
            }
            # Nowe filtry
            elseif ($additionalArgs[$i] -eq "--body" -and $i+1 -lt $additionalArgs.Length) {
                $filterArgs += "--body"
                $filterArgs += $additionalArgs[$i+1]
                $i += 2
            }
            elseif ($additionalArgs[$i] -eq "--date" -and $i+1 -lt $additionalArgs.Length) {
                $filterArgs += "--date-after"
                $filterArgs += $additionalArgs[$i+1]
                $i += 2
            }
            else {
                Write-Host "Blad: Nieprawidlowy argument filtrowania: $($additionalArgs[$i])" -ForegroundColor Red
                Show-Help
                exit 1
            }
        }
        
        $cliArgs += $filterArgs
    }
    "export-zip" {
        $zipArgs = @("export-zip")
        if ($additionalArgs.Length -gt 0) {
            $zipArgs += $additionalArgs
        }
        $cliArgs += $zipArgs
    }
    "toggle-relations" {
        $toggleArgs = @("toggle-relations")
        if ($additionalArgs.Length -gt 0) {
            $toggleArgs += $additionalArgs[0]
        }
        $cliArgs += $toggleArgs
    }
    "help" {
        Show-Help
        exit 0
    }
    default {
        if ($null -eq $command) {
            Show-Help
            exit 0
        }
        else {
            Write-Host "Blad: Nieznana komenda: $command" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}

Write-Host "Uruchamianie aplikacji w trybie CLI v2: $command $additionalArgs" -ForegroundColor Green

# Uruchamianie aplikacji z odpowiednimi flagami systemowymi
java "-Dapp.env=dev" -jar $jarPath $cliArgs

# W przypadku bledu wyswietl instrukcje
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nWystapil blad podczas wykonywania komendy" -ForegroundColor Red
    Show-Help
}