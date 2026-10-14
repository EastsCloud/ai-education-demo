[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Push-Location -LiteralPath (Join-Path $PSScriptRoot '..')
try {
    function Invoke-ProjectGit {
        param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArguments)
        & git -c http.proxy= -c https.proxy= -c http.sslBackend=openssl @GitArguments
        if ($LASTEXITCODE -ne 0) { throw "Git failed: $($GitArguments -join ' ')" }
    }
    if ((Invoke-ProjectGit branch --show-current) -ne 'main') { throw 'Switch to main before publishing.' }
    if (Invoke-ProjectGit status --porcelain) { throw 'Commit or resolve local changes before publishing.' }
    $expected = @{
        origin = 'https://github.com/EastsCloud/ai-education.git'
        demo = 'https://github.com/EastsCloud/ai-education-demo.git'
    }
    foreach ($remoteName in @('origin', 'demo')) {
        $remoteUrl = Invoke-ProjectGit remote get-url --push $remoteName
        if ($remoteUrl -ne $expected[$remoteName]) { throw "Unexpected $remoteName remote: $remoteUrl" }
        Invoke-ProjectGit fetch $remoteName
        $remoteHead = Invoke-ProjectGit ls-remote --heads $remoteName main
        if ($remoteHead) {
            Invoke-ProjectGit merge-base --is-ancestor "$remoteName/main" HEAD
        }
    }
    foreach ($remoteName in @('origin', 'demo')) {
        Invoke-ProjectGit push $remoteName main:main
    }
    Write-Output 'Published main to the development and portfolio repositories.'
} finally { Pop-Location }
