<#
.SYNOPSIS
    Runs the headless GDScript test suite in game/tests.
.EXAMPLE
    ./tools/run_tests.ps1
.EXAMPLE
    ./tools/run_tests.ps1 -Filter match_config
.NOTES
    Godot is located via -Godot, then $env:GODOT, then 'godot' on PATH.
    Use the *console* build on Windows so output reaches the terminal.
#>
param(
    [string]$Filter = "",
    [string]$Godot = $env:GODOT
)

if (-not $Godot) {
    $cmd = Get-Command godot -ErrorAction SilentlyContinue
    if ($cmd) { $Godot = $cmd.Source }
}
if (-not $Godot -or -not (Test-Path $Godot)) {
    Write-Host "Godot not found. Pass -Godot <path to Godot console exe> or set `$env:GODOT." -ForegroundColor Red
    exit 2
}

$project = Resolve-Path (Join-Path $PSScriptRoot "..\game")

# Refresh imports and the global class cache so newly added class_name scripts resolve.
& $Godot --headless --path $project --import *> $null

$godotArgs = @("--headless", "--path", $project, "-s", "res://tests/run_tests.gd")
if ($Filter) { $godotArgs += @("--", $Filter) }
& $Godot @godotArgs
exit $LASTEXITCODE
