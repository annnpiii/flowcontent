param(
    [switch]$Console,
    [switch]$Install,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Continue'
$baseDir = 'C:\Users\Administrator\Downloads\contentflow'
$caddyDir = 'C:\cloudflared'
$env:TZ = 'Asia/Makassar'
$nodePort = 80
$logFile = "$baseDir\data\service.log"
$tunnelName = 'flowcontent'

$null = New-Item -ItemType Directory -Path (Split-Path $logFile -Parent) -Force -ErrorAction SilentlyContinue

function Write-Log($msg, $color = 'Gray') {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $msg"
    if ($Console) { Write-Host $line -ForegroundColor $color }
    Add-Content -Path $logFile -Value $line
}

function Is-Alive($proc) {
    if (-not $proc) { return $false }
    try { return -not $proc.HasExited } catch { return $false }
}

function Kill-All {
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Kill() } catch {}
    }
    Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Kill() } catch {}
    }
    Start-Sleep -Seconds 2
}

function Start-NodeServer {
    try {
        $proc = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $baseDir -PassThru -WindowStyle Hidden -ErrorAction Stop
        Start-Sleep -Seconds 4
        $ok = $false
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$nodePort" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            $ok = $r.StatusCode -eq 200
        } catch {}
        if ($ok) {
            Write-Log "Node.js OK (PID: $($proc.Id))" green
        } else {
            Write-Log "Node.js started (PID: $($proc.Id)) - health check pending" yellow
        }
        return $proc
    } catch {
        Write-Log "Node.js FAILED: $_" red
        return $null
    }
}

function Start-CloudflareTunnel {
    try {
        $exe = "$caddyDir\cloudflared.exe"
        if (-not (Test-Path $exe)) {
            Write-Log "cloudflared.exe not found at $exe" red
            return $null
        }
        $proc = Start-Process -FilePath $exe -ArgumentList 'tunnel', 'run', $tunnelName -WorkingDirectory $caddyDir -PassThru -WindowStyle Hidden -ErrorAction Stop
        Start-Sleep -Seconds 5
        Write-Log "Cloudflare Tunnel OK (PID: $($proc.Id))" green
        return $proc
    } catch {
        Write-Log "Cloudflare Tunnel FAILED: $_" red
        return $null
    }
}

function Test-Site {
    try {
        $r = Invoke-WebRequest -Uri "https://$tunnelName.my.id" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

# ====== INSTALL / UNINSTALL ======
$taskName = 'ContentFlow'

if ($Install) {
    $psArgs = '-ExecutionPolicy Bypass -File "' + $baseDir + '\start.ps1" -Console'
    $action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument $psArgs
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

    try {
        $null = Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
        Write-Host '[OK] Scheduled Task installed as SYSTEM.' -ForegroundColor Green
        Write-Host '[OK] ContentFlow will auto-start on every boot.' -ForegroundColor Green
        Write-Host ''
        Write-Host 'Manual commands:' -ForegroundColor Cyan
        Write-Host "  Start   : Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
        Write-Host "  Stop    : Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
        Write-Host "  Logs    : Get-Content '$logFile' -Tail 20" -ForegroundColor White
    } catch {
        Write-Host "[ERR] Failed to install task: $_" -ForegroundColor Red
    }
    exit
}

if ($Uninstall) {
    try {
        $null = Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host '[OK] Scheduled Task removed.' -ForegroundColor Green
    } catch {
        Write-Host "[ERR] Failed to uninstall: $_" -ForegroundColor Red
    }
    Kill-All
    exit
}

# ====== MAIN LOOP ======
Write-Log '========== ContentFlow Service Started ==========' cyan
Write-Log "Base: $baseDir" cyan
$restartCount = 0
$backoff = 5

while ($true) {
    $restartCount++
    Write-Log "--- Start cycle #$restartCount ---" yellow

    Kill-All

    $nodeProc = Start-NodeServer
    $cfProc = Start-CloudflareTunnel

    if (-not $nodeProc -and -not $cfProc) {
        Write-Log "Both services failed. Waiting ${backoff}s before retry..." red
        Start-Sleep -Seconds $backoff
        $backoff = [Math]::Min($backoff + 5, 60)
        continue
    }
    $backoff = 5

    Start-Sleep -Seconds 8
    if (Test-Site) {
        Write-Log "SITE ONLINE: https://$tunnelName.my.id" green
    } else {
        Write-Log 'Site not reachable yet - monitoring continues' yellow
    }

    $healthTicks = 0
    while ($true) {
        Start-Sleep -Seconds 15
        $healthTicks++

        $nodeOk = Is-Alive $nodeProc
        if (-not $nodeOk) {
            $fallback = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $nodeProc.Id }
            if ($fallback) {
                Write-Log 'Node.js PID changed - re-acquired' yellow
                $nodeProc = $fallback | Select-Object -First 1
                $nodeOk = $true
            }
        }
        if (-not $nodeOk) {
            Write-Log 'Node.js DIED - restarting' red
            break
        }

        $cfOk = Is-Alive $cfProc
        if (-not $cfOk) {
            $fallback = Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $cfProc.Id }
            if ($fallback) {
                Write-Log 'Cloudflare PID changed - re-acquired' yellow
                $cfProc = $fallback | Select-Object -First 1
                $cfOk = $true
            }
        }
        if (-not $cfOk) {
            Write-Log 'Cloudflare Tunnel DIED - restarting' red
            break
        }

        if ($healthTicks % 8 -eq 0) {
            if (-not (Test-Site)) {
                Write-Log 'Health check FAILED - site down, restarting' red
                break
            }
            Write-Log 'Health check OK' gray
        }
    }

    Kill-All
}
