param(
  [string]$ServiceName = "max-miniapp-backend",
  [string]$DisplayName = "Max Miniapp Backend",
  [string]$BackendDir = "C:\apps\max-miniapp\backend",
  [string]$NodeExe = "C:\Program Files\nodejs\node.exe",
  [string]$NssmExe = "C:\tools\nssm\nssm.exe",
  [string]$LogDir = "C:\apps\max-miniapp\logs",
  [string]$AppArgs = "src\\server.js"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Checking paths..."
if (!(Test-Path $NssmExe)) { throw "NSSM not found: $NssmExe" }
if (!(Test-Path $NodeExe)) { throw "Node executable not found: $NodeExe" }
if (!(Test-Path $BackendDir)) { throw "Backend directory not found: $BackendDir" }

$EnvFile = Join-Path $BackendDir ".env"
if (!(Test-Path $EnvFile)) {
  Write-Warning ".env not found: $EnvFile"
  Write-Warning "Create .env and set JWT_SECRET, NODE_ENV=production, REDIS_URL"
}

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$StdoutLog = Join-Path $LogDir "backend-out.log"
$StderrLog = Join-Path $LogDir "backend-err.log"

Write-Host "==> Installing/updating service: $ServiceName"
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.Status -ne "Stopped") {
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 1
  }
} else {
  & $NssmExe install $ServiceName $NodeExe $AppArgs
}

& $NssmExe set $ServiceName Application $NodeExe
& $NssmExe set $ServiceName AppDirectory $BackendDir
& $NssmExe set $ServiceName AppParameters $AppArgs
& $NssmExe set $ServiceName DisplayName $DisplayName
& $NssmExe set $ServiceName Start SERVICE_AUTO_START

& $NssmExe set $ServiceName AppStdout $StdoutLog
& $NssmExe set $ServiceName AppStderr $StderrLog
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName AppRotateOnline 1
& $NssmExe set $ServiceName AppRotateSeconds 86400
& $NssmExe set $ServiceName AppRotateBytes 10485760

& $NssmExe set $ServiceName AppExit Default Restart
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000 | Out-Null

Write-Host "==> Starting service..."
Start-Service -Name $ServiceName

Write-Host "==> Service status:"
Get-Service -Name $ServiceName | Format-Table -AutoSize

Write-Host "==> Recent logs:"
if (Test-Path $StdoutLog) { Get-Content $StdoutLog -Tail 20 }
if (Test-Path $StderrLog) { Get-Content $StderrLog -Tail 20 }
