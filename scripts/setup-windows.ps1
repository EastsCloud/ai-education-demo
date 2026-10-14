#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipStart,
    [ValidateSet('snapshot', 'clean')]
    [string]$Mode = 'snapshot',
    [ValidateRange(1, 65535)]
    [int]$Port = 4177
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'node-runtime.ps1')

try {
    # Always prepare a project-local runtime so launch does not depend on a
    # terminal, editor, administrator account, or machine PATH configuration.
    $nodeExecutable = Find-ProjectNode -ProjectDirectory $projectDirectory -LocalOnly
    if (!$nodeExecutable) {
        $architecture = $env:PROCESSOR_ARCHITEW6432
        if (!$architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
        switch ($architecture.ToUpperInvariant()) {
            'AMD64' { $archiveArchitecture = 'x64' }
            'ARM64' { $archiveArchitecture = 'arm64' }
            default { throw "Unsupported Windows architecture: $architecture. Use 64-bit Windows (x64 or ARM64)." }
        }

        Write-Host '[1/4] Finding the latest Node.js 24 Windows release on nodejs.org...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $releaseIndex = 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt'
        $checksums = (Invoke-WebRequest -UseBasicParsing -Uri $releaseIndex -TimeoutSec 60).Content
        $archivePattern = '^([a-fA-F0-9]{64})\s+(node-v(24\.\d+\.\d+)-win-' + $archiveArchitecture + '\.zip)$'
        $release = @($checksums -split '\r?\n' | Where-Object { $_.Trim() -match $archivePattern })
        if ($release.Count -ne 1) {
            throw 'The official checksum list did not contain exactly one matching Node.js 24 archive.'
        }
        $releaseMatch = [regex]::Match($release[0].Trim(), $archivePattern)
        $expectedHash = $releaseMatch.Groups[1].Value
        $archiveName = $releaseMatch.Groups[2].Value
        $releaseVersion = $releaseMatch.Groups[3].Value
        $directoryName = [IO.Path]::GetFileNameWithoutExtension($archiveName)
        $runId = [Guid]::NewGuid().ToString('N')
        $downloadDirectory = Join-Path $projectDirectory "runtime-data/node-setup-$runId"
        $installRoot = [IO.Path]::GetFullPath((Join-Path $projectDirectory '.tools/nodejs'))
        New-Item -ItemType Directory -Path $downloadDirectory, $installRoot -Force | Out-Null
        $archivePath = Join-Path $downloadDirectory $archiveName
        $checksums | Set-Content -LiteralPath (Join-Path $downloadDirectory 'SHASUMS256.txt') -Encoding ascii

        Write-Host "[2/4] Downloading Node.js $releaseVersion ($archiveArchitecture)..."
        $archiveUrl = "https://nodejs.org/dist/v$releaseVersion/$archiveName"
        Invoke-WebRequest -UseBasicParsing -Uri $archiveUrl -OutFile $archivePath -TimeoutSec 300
        $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
        if ($actualHash -ne $expectedHash) {
            throw 'SHA256 verification failed. The downloaded archive will not be installed or executed.'
        }

        Write-Host '[3/4] Checksum verified. Extracting and checking Node.js + SQLite...'
        $extractionRoot = Join-Path $downloadDirectory 'extracted'
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractionRoot
        $extractedDirectory = [IO.Path]::GetFullPath((Join-Path $extractionRoot $directoryName))
        $stagedNode = Join-Path $extractedDirectory 'node.exe'
        if (!(Test-ProjectNode -Executable $stagedNode)) { throw 'The downloaded Node.js runtime failed its version/SQLite check.' }

        $destination = [IO.Path]::GetFullPath((Join-Path $installRoot $directoryName))
        if (Test-Path -LiteralPath $destination) {
            $destination = [IO.Path]::GetFullPath((Join-Path $installRoot "$directoryName-$runId"))
        }
        # Check both resolved paths before moving the extracted directory.
        $sourceBoundary = [IO.Path]::GetFullPath($extractionRoot).TrimEnd('\') + '\'
        $destinationBoundary = $installRoot.TrimEnd('\') + '\'
        if (!$extractedDirectory.StartsWith($sourceBoundary, [StringComparison]::OrdinalIgnoreCase) -or
            !$destination.StartsWith($destinationBoundary, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Runtime installation path is outside the expected project directories.'
        }
        Move-Item -LiteralPath $extractedDirectory -Destination $destination
        $nodeExecutable = Join-Path $destination 'node.exe'
    }
    else {
        Write-Host 'Reusing the verified project-local Node.js runtime.'
    }

    Write-Host "[4/4] Environment ready: $nodeExecutable"
    & $nodeExecutable --version
    if (!$SkipStart) {
        Write-Host "Starting the app at http://127.0.0.1:$Port/"
        & (Join-Path $PSScriptRoot 'dev.ps1') -Action start -Mode $Mode -Port $Port
    }
}
catch {
    Write-Host ''
    Write-Host "Setup/start failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Downloads require HTTPS access to nodejs.org. Fix the reported issue and run this script again.'
    Write-Host 'Existing learning databases are kept. Download evidence is under runtime-data/node-setup-*.'
    exit 1
}
