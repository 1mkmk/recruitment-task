# Run-Frontend.ps1 - Script to run the frontend development server
# Created for JSONPlaceholder Post Downloader application

# Go to the frontend directory
Write-Host "Navigating to frontend-react directory..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend-react"

# Check if the directory change was successful
if ((Get-Location).Path -notlike "*frontend-react") {
    Write-Host "ERROR: Failed to navigate to frontend-react directory" -ForegroundColor Red
    exit 1
}

# Check if the package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found in $(Get-Location)" -ForegroundColor Red
    exit 1
}

Write-Host "Starting frontend development server..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "Directory: $(Get-Location)" -ForegroundColor Green
Write-Host "Running: yarn dev" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Run the development server
yarn dev 