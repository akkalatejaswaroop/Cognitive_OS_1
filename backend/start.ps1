# Cognitive OS Backend — Local Development Start Script
param(
    [string]$Host = "0.0.0.0",
    [int]$Port = 8000,
    [switch]$NoReload
)

$VenvPython = Join-Path $PSScriptRoot "venv" "Scripts" "python.exe"
$RunPy = Join-Path $PSScriptRoot "run.py"

if (-not (Test-Path $VenvPython)) {
    Write-Error "Virtual environment not found at $VenvPython. Run: python -m venv venv"
    exit 1
}

$reloadArg = if (-not $NoReload) { "--reload" } else { "" }
Write-Host "Starting Cognitive OS API on http://${Host}:${Port}" -ForegroundColor Green
& $VenvPython $RunPy
