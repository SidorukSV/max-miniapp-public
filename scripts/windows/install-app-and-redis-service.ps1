param(
    [string]$ProjectRoot = "",
    [string]$BackendServiceName = "max-miniapp-backend",
    [string]$BackendDisplayName = "Max Miniapp Backend",
    [string]$RedisServiceName = "redis",
    [string]$RedisDisplayName = "Redis",
    [string]$RedisDir = "C:\apps\redis",
    [string]$RedisZipUrl = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip",
    [string]$NssmExe = "C:\tools\nssm\nssm.exe",
    [string]$NssmZipUrl = "https://nssm.cc/release/nssm-2.24.zip",
    [string]$NodeExe = "",
    [int]$Port = 3000,
    [string]$PublicOrigin = "",
    [switch]$SkipDependencyInstall,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)

    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run this script from an elevated PowerShell session."
    }
}

function Resolve-ProjectRoot {
    param([string]$ConfiguredProjectRoot)

    if ($ConfiguredProjectRoot) {
        return (Resolve-Path -LiteralPath $ConfiguredProjectRoot).Path
    }

    $scriptDirectory = Split-Path -Parent $PSCommandPath
    return (Resolve-Path -LiteralPath (Join-Path $scriptDirectory "..\..")).Path
}

function Resolve-NodeExecutable {
    param([string]$ConfiguredNodeExe)

    if ($ConfiguredNodeExe) {
        if (-not (Test-Path -LiteralPath $ConfiguredNodeExe -PathType Leaf)) {
            throw "Node executable not found: $ConfiguredNodeExe"
        }

        return (Resolve-Path -LiteralPath $ConfiguredNodeExe).Path
    }

    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "node.exe was not found in PATH. Install Node.js LTS x64 first."
    }

    return $command.Source
}

function Invoke-DownloadFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,

        [Parameter(Mandatory = $true)]
        [string]$OutputFile
    )

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $OutputFile -UseBasicParsing
}

function Ensure-Nssm {
    param(
        [string]$ConfiguredNssmExe,
        [string]$DownloadUrl
    )

    if (Test-Path -LiteralPath $ConfiguredNssmExe -PathType Leaf) {
        return (Resolve-Path -LiteralPath $ConfiguredNssmExe).Path
    }

    $nssmDirectory = Split-Path -Parent $ConfiguredNssmExe
    New-Item -ItemType Directory -Force -Path $nssmDirectory | Out-Null

    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("max-miniapp-nssm-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null

    try {
        $archivePath = Join-Path $temporaryRoot "nssm.zip"
        Write-Host "Downloading NSSM: $DownloadUrl"
        Invoke-DownloadFile -Url $DownloadUrl -OutputFile $archivePath
        Expand-Archive -LiteralPath $archivePath -DestinationPath $temporaryRoot -Force

        $candidate = Get-ChildItem -LiteralPath $temporaryRoot -Filter "nssm.exe" -Recurse -File |
            Where-Object { $_.FullName -match "\\win64\\nssm\.exe$" } |
            Select-Object -First 1

        if (-not $candidate) {
            throw "Downloaded NSSM archive does not contain win64\nssm.exe"
        }

        Copy-Item -LiteralPath $candidate.FullName -Destination $ConfiguredNssmExe -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryRoot) {
            Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
        }
    }

    return (Resolve-Path -LiteralPath $ConfiguredNssmExe).Path
}

function New-StrongSecret {
    $bytes = [byte[]]::new(48)
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ([Convert]::ToBase64String($bytes) + "Aa1!")
}

function Read-EnvFile {
    param([string]$Path)

    $result = [ordered]@{}
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $result
    }

    foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
        if ($line -notmatch "^\s*([^#=\s]+)\s*=(.*)$") {
            continue
        }

        $result[$matches[1]] = $matches[2]
    }

    return $result
}

function Write-EnvFile {
    param(
        [string]$Path,
        [System.Collections.IDictionary]$Values
    )

    $content = foreach ($key in $Values.Keys) {
        "$key=$($Values[$key])"
    }

    Set-Content -LiteralPath $Path -Encoding UTF8 -Value $content
}

function Ensure-BackendEnv {
    param(
        [string]$BackendDir,
        [string]$FrontendDistDir,
        [int]$BackendPort,
        [string]$Origin
    )

    $envFile = Join-Path $BackendDir ".env"
    $values = Read-EnvFile -Path $envFile

    if (-not $values.Contains("JWT_SECRET")) {
        $values["JWT_SECRET"] = New-StrongSecret
    }

    $defaults = [ordered]@{
        "NODE_ENV" = "production"
        "PORT" = [string]$BackendPort
        "REDIS_URL" = "redis://127.0.0.1:6379"
        "REDIS_CONNECT_TIMEOUT_MS" = "5000"
        "BACKEND_LOG_FILE" = "..\logs\backend.log"
        "BACKEND_LOG_LEVEL" = "info"
        "FRONTEND_DIST_DIR" = $FrontendDistDir
        "REFRESH_COOKIE_SECURE" = "true"
        "REFRESH_COOKIE_SAMESITE" = "none"
    }

    foreach ($key in $defaults.Keys) {
        if (-not $values.Contains($key)) {
            $values[$key] = $defaults[$key]
        }
    }

    if ($Origin -and -not $values.Contains("CORS_ALLOWED_ORIGINS")) {
        $values["CORS_ALLOWED_ORIGINS"] = $Origin.TrimEnd("/")
    }

    if (-not $values.Contains("MAX_WEBHOOK_SECRET")) {
        $values["MAX_WEBHOOK_SECRET"] = New-StrongSecret
    }

    Write-EnvFile -Path $envFile -Values $values
    Write-Host "Backend env file is ready: $envFile"
}

function Ensure-RedisService {
    param(
        [string]$InstallDir,
        [string]$DownloadUrl,
        [string]$ServiceName,
        [string]$DisplayName
    )

    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    $redisServer = Join-Path $InstallDir "redis-server.exe"

    if (-not (Test-Path -LiteralPath $redisServer -PathType Leaf)) {
        $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("max-miniapp-redis-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null

        try {
            $archivePath = Join-Path $temporaryRoot "redis.zip"
            Write-Host "Downloading Redis for Windows: $DownloadUrl"
            Invoke-DownloadFile -Url $DownloadUrl -OutputFile $archivePath
            Expand-Archive -LiteralPath $archivePath -DestinationPath $temporaryRoot -Force

            $extractedRedisServer = Get-ChildItem -LiteralPath $temporaryRoot -Filter "redis-server.exe" -Recurse -File |
                Select-Object -First 1

            if (-not $extractedRedisServer) {
                throw "Downloaded Redis archive does not contain redis-server.exe"
            }

            Get-ChildItem -LiteralPath $extractedRedisServer.DirectoryName -Force |
                Copy-Item -Destination $InstallDir -Recurse -Force
        } finally {
            if (Test-Path -LiteralPath $temporaryRoot) {
                Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
            }
        }
    }

    $redisConf = Join-Path $InstallDir "redis.windows-service.conf"
    if (-not (Test-Path -LiteralPath $redisConf -PathType Leaf)) {
        @(
            "bind 127.0.0.1"
            "port 6379"
            "protected-mode yes"
            "dir `"$InstallDir`""
            "logfile `"redis-service.log`""
            "appendonly yes"
            "maxmemory-policy noeviction"
        ) | Set-Content -LiteralPath $redisConf -Encoding ASCII
    }

    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Host "Installing Redis service: $ServiceName"
        & $redisServer --service-install $redisConf --service-name $ServiceName --loglevel notice | Out-Host
        sc.exe config $ServiceName DisplayName= $DisplayName | Out-Null
        sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null
    }

    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    if ($service.Status -ne "Running") {
        Start-Service -Name $ServiceName
    }
}

function Invoke-Npm {
    param(
        [string]$WorkingDirectory,
        [string[]]$Arguments
    )

    Push-Location $WorkingDirectory
    try {
        & npm @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "npm $($Arguments -join ' ') failed in $WorkingDirectory"
        }
    } finally {
        Pop-Location
    }
}

function Install-BackendService {
    param(
        [string]$ServiceName,
        [string]$DisplayName,
        [string]$BackendDir,
        [string]$NodePath,
        [string]$NssmPath,
        [string]$LogDir
    )

    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -ne "Stopped") {
        Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
    }

    if (-not $service) {
        & $NssmPath install $ServiceName $NodePath "src\server.js" | Out-Host
    }

    & $NssmPath set $ServiceName Application $NodePath | Out-Null
    & $NssmPath set $ServiceName AppDirectory $BackendDir | Out-Null
    & $NssmPath set $ServiceName AppParameters "src\server.js" | Out-Null
    & $NssmPath set $ServiceName DisplayName $DisplayName | Out-Null
    & $NssmPath set $ServiceName Start SERVICE_AUTO_START | Out-Null
    & $NssmPath set $ServiceName AppStdout (Join-Path $LogDir "backend-out.log") | Out-Null
    & $NssmPath set $ServiceName AppStderr (Join-Path $LogDir "backend-err.log") | Out-Null
    & $NssmPath set $ServiceName AppRotateFiles 1 | Out-Null
    & $NssmPath set $ServiceName AppRotateOnline 1 | Out-Null
    & $NssmPath set $ServiceName AppRotateSeconds 86400 | Out-Null
    & $NssmPath set $ServiceName AppRotateBytes 10485760 | Out-Null
    & $NssmPath set $ServiceName AppExit Default Restart | Out-Null
    sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null

    Start-Service -Name $ServiceName
}

Assert-Administrator

$resolvedProjectRoot = Resolve-ProjectRoot -ConfiguredProjectRoot $ProjectRoot
$backendDir = Join-Path $resolvedProjectRoot "backend"
$frontendDir = Join-Path $resolvedProjectRoot "frontend"
$logsDir = Join-Path $resolvedProjectRoot "logs"
$frontendDistRelativeToBackend = "..\frontend\dist"

if (-not (Test-Path -LiteralPath $backendDir -PathType Container)) {
    throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path -LiteralPath $frontendDir -PathType Container)) {
    throw "Frontend directory not found: $frontendDir"
}

$resolvedNodeExe = Resolve-NodeExecutable -ConfiguredNodeExe $NodeExe
$resolvedNssmExe = Ensure-Nssm -ConfiguredNssmExe $NssmExe -DownloadUrl $NssmZipUrl

Ensure-RedisService `
    -InstallDir $RedisDir `
    -DownloadUrl $RedisZipUrl `
    -ServiceName $RedisServiceName `
    -DisplayName $RedisDisplayName

if (-not $SkipDependencyInstall) {
    Invoke-Npm -WorkingDirectory $frontendDir -Arguments @("ci")
    Invoke-Npm -WorkingDirectory $backendDir -Arguments @("ci", "--omit=dev")
}

if (-not $SkipFrontendBuild) {
    Invoke-Npm -WorkingDirectory $frontendDir -Arguments @("run", "build")
}

Ensure-BackendEnv `
    -BackendDir $backendDir `
    -FrontendDistDir $frontendDistRelativeToBackend `
    -BackendPort $Port `
    -Origin $PublicOrigin

Install-BackendService `
    -ServiceName $BackendServiceName `
    -DisplayName $BackendDisplayName `
    -BackendDir $backendDir `
    -NodePath $resolvedNodeExe `
    -NssmPath $resolvedNssmExe `
    -LogDir $logsDir

Write-Host ""
Write-Host "Installation complete."
Get-Service -Name $RedisServiceName, $BackendServiceName | Format-Table -AutoSize
Write-Host ""
Write-Host "Health check:"
Write-Host "  http://127.0.0.1:$Port/healthz"
