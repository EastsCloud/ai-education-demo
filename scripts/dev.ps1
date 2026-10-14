[CmdletBinding()]
param(
    [ValidateSet('start', 'test', 'e2e', 'verify')]
    [string]$Action = 'start',
    [ValidateSet('snapshot', 'clean')]
    [string]$Mode = 'snapshot',
    [ValidateRange(1, 65535)]
    [int]$Port = 4177
)

$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeDirectory = Join-Path $projectDirectory 'runtime-data'
$savedPort = $env:PORT
$savedDatabase = $env:AI_EDUCATION_DATABASE_PATH
$savedE2eDatabase = $env:AI_EDUCATION_E2E_DATABASE
$savedE2eReports = $env:AI_EDUCATION_E2E_REPORT_DIR

Push-Location -LiteralPath $projectDirectory
try {
    if ($Action -eq 'verify') {
        $checked = 0
        foreach ($line in (Get-Content -LiteralPath 'MANIFEST.sha256')) {
            if ($line -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
                if ($line.Trim()) { throw "Invalid manifest line: $line" }
                continue
            }
            $expectedHash = $matches[1]
            $manifestFile = $matches[2]
            if (!(Test-Path -LiteralPath $manifestFile -PathType Leaf)) {
                throw "Missing file: $manifestFile"
            }
            if ((Get-FileHash -LiteralPath $manifestFile -Algorithm SHA256).Hash -ne $expectedHash) {
                throw "Hash mismatch: $manifestFile"
            }
            $checked++
        }
        if ($checked -eq 0) { throw 'Manifest contains no files.' }
        Write-Output "Delivery manifest: $checked files verified (new development files are not in this manifest)."
        return
    }

    . (Join-Path $PSScriptRoot 'node-runtime.ps1')
    $nodeExecutable = Find-ProjectNode -ProjectDirectory $projectDirectory
    if (!$nodeExecutable) {
        throw 'Node.js 24+ with SQLite was not found. Double-click start-windows.cmd in the project directory to install the environment and start the app.'
    }
    New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

    switch ($Action) {
        'start' {
            $databaseName = if ($Mode -eq 'snapshot') { 'system-e2e-it-review.sqlite' } else { 'ai-education-clean.sqlite' }
            $databaseFile = Join-Path $runtimeDirectory $databaseName
            if ($Mode -eq 'snapshot' -and !(Test-Path -LiteralPath $databaseFile)) {
                $snapshotFile = Join-Path $projectDirectory 'test-data/system-e2e-final.sqlite'
                if (Test-Path -LiteralPath $snapshotFile) {
                    Copy-Item -LiteralPath $snapshotFile -Destination $databaseFile
                } else {
                    $databaseFile = Join-Path $runtimeDirectory 'ai-education-clean.sqlite'
                    Write-Output 'The archive snapshot is not in Git. Starting a local development database; use -Action e2e to generate a new five-learner cohort.'
                }
            }
            $env:PORT = [string]$Port
            $env:AI_EDUCATION_DATABASE_PATH = $databaseFile
            Write-Output "Database: $databaseFile"
            Write-Output "Open http://127.0.0.1:$Port/ (Ctrl+C to stop)."
            & $nodeExecutable (Join-Path $PSScriptRoot '../server/dev-server.mjs')
            if ($LASTEXITCODE -ne 0) { throw "Server exited with code $LASTEXITCODE" }
        }
        'test' {
            $runStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
            $logFile = Join-Path $runtimeDirectory "contracts-$runStamp.log"
            $passed = 0
            $failed = @()
            $contracts = @(Get-ChildItem -LiteralPath (Join-Path $projectDirectory 'server') -Filter '*-contract.mjs' | Sort-Object Name)
            if ($contracts.Count -eq 0) { throw 'No contract files found.' }
            foreach ($contract in $contracts) {
                & $nodeExecutable $contract.FullName 2>&1 | Tee-Object -FilePath $logFile -Append
                if ($LASTEXITCODE -eq 0) { $passed++ } else { $failed += $contract.Name }
            }
            "PowerShell contract-suite: $passed passed; $($failed.Count) failed" | Tee-Object -FilePath $logFile -Append
            Write-Output "Log: $logFile"
            if ($failed.Count) { throw "Failed contracts: $($failed -join ', ')" }
        }
        'e2e' {
            $runStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
            $env:AI_EDUCATION_E2E_DATABASE = Join-Path $runtimeDirectory "system-e2e-$runStamp.sqlite"
            $env:AI_EDUCATION_E2E_REPORT_DIR = Join-Path $runtimeDirectory "e2e-reports-$runStamp"
            & $nodeExecutable (Join-Path $PSScriptRoot '../server/system-journey-e2e.mjs')
            if ($LASTEXITCODE -ne 0) { throw "E2E exited with code $LASTEXITCODE" }
        }
    }
}
finally {
    $env:PORT = $savedPort
    $env:AI_EDUCATION_DATABASE_PATH = $savedDatabase
    $env:AI_EDUCATION_E2E_DATABASE = $savedE2eDatabase
    $env:AI_EDUCATION_E2E_REPORT_DIR = $savedE2eReports
    Pop-Location
}
