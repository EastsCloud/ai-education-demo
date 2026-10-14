# Shared by the Windows setup and development scripts. PowerShell 5.1 compatible.
function Test-ProjectNode {
    param([Parameter(Mandatory = $true)][string]$Executable)
    if (!(Test-Path -LiteralPath $Executable -PathType Leaf)) { return $false }
    try {
        $versionText = (& $Executable --version 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or $versionText -notmatch '^v(\d+)\.') { return $false }
        if ([int]$matches[1] -lt 24) { return $false }
        & $Executable --no-warnings -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(':memory:'); db.exec('SELECT 1'); db.close();" 2>$null
        return ($LASTEXITCODE -eq 0)
    }
    catch { return $false }
}

function Find-ProjectNode {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectDirectory,
        [switch]$LocalOnly
    )
    $localDirectory = Join-Path $ProjectDirectory '.tools/nodejs'
    if (Test-Path -LiteralPath $localDirectory) {
        $installations = Get-ChildItem -LiteralPath $localDirectory -Directory -Filter 'node-v*-win-*' |
            Sort-Object LastWriteTimeUtc -Descending
        foreach ($installation in $installations) {
            $candidate = Join-Path $installation.FullName 'node.exe'
            if (Test-ProjectNode -Executable $candidate) { return $candidate }
        }
    }
    if (!$LocalOnly) {
        $commands = @(Get-Command node -CommandType Application -All -ErrorAction SilentlyContinue)
        foreach ($command in $commands) {
            if (Test-ProjectNode -Executable $command.Source) { return $command.Source }
        }
    }
    return $null
}
