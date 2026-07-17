[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDir,

    [Parameter(Mandatory = $true)]
    [string]$OutputFile,

    [string]$ExtensionName = "бит_МедицинаОмни_ПРОФ",
    [string]$V8Path = $env:ONEC_V8_PATH,
    [string]$BaseCf = $env:ONEC_BASE_CF,
    [string]$SeedCfe = $env:ONEC_SEED_CFE
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-V8Executable {
    param([string]$ConfiguredPath)

    if ($ConfiguredPath) {
        if (Test-Path -LiteralPath $ConfiguredPath -PathType Leaf) {
            return (Resolve-Path -LiteralPath $ConfiguredPath).Path
        }

        $executableInDirectory = Join-Path $ConfiguredPath "1cv8.exe"
        if (Test-Path -LiteralPath $executableInDirectory -PathType Leaf) {
            return (Resolve-Path -LiteralPath $executableInDirectory).Path
        }

        throw "ONEC_V8_PATH does not point to 1cv8.exe or its bin directory: $ConfiguredPath"
    }

    $platformRoot = Join-Path $env:ProgramFiles "1cv8"
    $detectedExecutable = Get-ChildItem -LiteralPath $platformRoot -Filter "1cv8.exe" -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    if (-not $detectedExecutable) {
        throw "1cv8.exe was not found. Set the ONEC_V8_PATH repository variable."
    }

    return $detectedExecutable.FullName
}

function Invoke-OneC {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$LogPath,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if (Test-Path -LiteralPath $LogPath) {
        Remove-Item -LiteralPath $LogPath -Force
    }

    Write-Host "::group::$Description"
    Write-Host "1cv8.exe $($Arguments -join ' ')"

    $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $script:V8Executable
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    foreach ($argument in @($Arguments) + @("/Out", $LogPath, "/DisableStartupDialogs")) {
        $processInfo.ArgumentList.Add($argument)
    }

    $process = [System.Diagnostics.Process]::Start($processInfo)
    $process.WaitForExit()
    $exitCode = $process.ExitCode
    $process.Dispose()

    if (Test-Path -LiteralPath $LogPath) {
        Get-Content -LiteralPath $LogPath -Encoding Default
    }

    Write-Host "::endgroup::"

    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode"
    }
}

$script:V8Executable = Resolve-V8Executable -ConfiguredPath $V8Path
$resolvedSourceDir = (Resolve-Path -LiteralPath $SourceDir).Path

if (-not $BaseCf) {
    throw "ONEC_BASE_CF is required and must point to a compatible base configuration CF on the self-hosted runner."
}

$resolvedBaseCf = (Resolve-Path -LiteralPath $BaseCf).Path
if ([System.IO.Path]::GetExtension($resolvedBaseCf) -ne ".cf") {
    throw "ONEC_BASE_CF must point to a CF file: $resolvedBaseCf"
}

if ($SeedCfe) {
    $SeedCfe = (Resolve-Path -LiteralPath $SeedCfe).Path
}

$resolvedOutputFile = [System.IO.Path]::GetFullPath($OutputFile)
$outputDirectory = Split-Path -Parent $resolvedOutputFile
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$runnerTemp = if ($env:RUNNER_TEMP) {
    [System.IO.Path]::GetFullPath($env:RUNNER_TEMP)
} else {
    [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
}

$workRoot = Join-Path $runnerTemp ("max-miniapp-cfe-" + [guid]::NewGuid().ToString("N"))
$databasePath = Join-Path $workRoot "database"
$logsPath = Join-Path $workRoot "logs"
New-Item -ItemType Directory -Path $logsPath -Force | Out-Null

try {
    Invoke-OneC `
        -Description "Create temporary 1C database" `
        -LogPath (Join-Path $logsPath "create.log") `
        -Arguments @(
            "CREATEINFOBASE",
            "File=$databasePath"
        )

    Invoke-OneC `
        -Description "Load compatible base configuration" `
        -LogPath (Join-Path $logsPath "load-base.log") `
        -Arguments @(
            "DESIGNER",
            "/F", $databasePath,
            "/LoadCfg", $resolvedBaseCf,
            "/UpdateDBCfg"
        )

    if ($SeedCfe) {
        Invoke-OneC `
            -Description "Load seed extension" `
            -LogPath (Join-Path $logsPath "load-seed-extension.log") `
            -Arguments @(
                "DESIGNER",
                "/F", $databasePath,
                "/LoadCfg", $SeedCfe,
                "-Extension", $ExtensionName
            )
    }

    Invoke-OneC `
        -Description "Load extension sources" `
        -LogPath (Join-Path $logsPath "load-extension-sources.log") `
        -Arguments @(
            "DESIGNER",
            "/F", $databasePath,
            "/LoadConfigFromFiles", $resolvedSourceDir,
            "-Format", "Hierarchical",
            "-Extension", $ExtensionName
        )

    Invoke-OneC `
        -Description "Build CFE" `
        -LogPath (Join-Path $logsPath "dump-extension.log") `
        -Arguments @(
            "DESIGNER",
            "/F", $databasePath,
            "/DumpCfg", $resolvedOutputFile,
            "-Extension", $ExtensionName
        )

    $artifact = Get-Item -LiteralPath $resolvedOutputFile
    if ($artifact.Length -eq 0) {
        throw "The generated CFE is empty: $resolvedOutputFile"
    }

    $checksum = (Get-FileHash -LiteralPath $resolvedOutputFile -Algorithm SHA256).Hash.ToLowerInvariant()
    $checksumFile = "$resolvedOutputFile.sha256"
    "$checksum  $($artifact.Name)" | Set-Content -LiteralPath $checksumFile -Encoding Ascii

    Write-Host "CFE=$resolvedOutputFile"
    Write-Host "SHA256=$checksum"
} finally {
    $resolvedWorkRoot = [System.IO.Path]::GetFullPath($workRoot)
    $resolvedRunnerTemp = $runnerTemp.TrimEnd("\") + "\"

    if (-not $resolvedWorkRoot.StartsWith($resolvedRunnerTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a build directory outside RUNNER_TEMP: $resolvedWorkRoot"
    }

    if (Test-Path -LiteralPath $resolvedWorkRoot) {
        Remove-Item -LiteralPath $resolvedWorkRoot -Recurse -Force
    }
}
