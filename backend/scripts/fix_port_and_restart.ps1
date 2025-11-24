<#
Usage:
  PowerShell -ExecutionPolicy Bypass -File .\backend\scripts\fix_port_and_restart.ps1

What it does:
  - 查找佔用本機 5000 埠的 process
  - 顯示 PID 與程式名稱，並終止那些 process
  - 提示是否要啟動後端（以 node server.js）

注意：此腳本在你的本機上執行並會終止程序，請確認不要誤殺重要服務。
#>

param(
  [string]$BackendDir = "..\",
  [int]$Port = 5000
)

Write-Host "Searching for processes listening on port $Port..." -ForegroundColor Cyan

$conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $conns) {
  Write-Host "No processes found listening on port $Port." -ForegroundColor Green
} else {
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    try {
      $proc = Get-Process -Id $pid -ErrorAction Stop
      Write-Host "Found PID $($proc.Id) - $($proc.ProcessName) (Path: $($proc.Path))" -ForegroundColor Yellow
    } catch {
      Write-Host "Found PID $pid (process may have exited)" -ForegroundColor Yellow
    }
  }

  $confirm = Read-Host "Terminate these processes? (Y/N)"
  if ($confirm -match '^[Yy]') {
    foreach ($pid in $pids) {
      try {
        Stop-Process -Id $pid -Force -ErrorAction Stop
        Write-Host "Stopped PID $pid" -ForegroundColor Green
      } catch {
        Write-Host "Failed to stop PID $pid: $($_.Exception.Message)" -ForegroundColor Red
      }
    }
  } else {
    Write-Host "Aborted by user. No processes were killed." -ForegroundColor Magenta
    exit 0
  }
}

Write-Host "\nDo you want to start the backend now? (will run 'node server.js' in $BackendDir)" -ForegroundColor Cyan
$startNow = Read-Host "Start backend now? (Y/N)"
if ($startNow -match '^[Yy]') {
  Push-Location $BackendDir
  Write-Host "Starting backend: node .\server.js (logs will appear in this console)" -ForegroundColor Cyan
  # Start node in the current window (blocking) so you can see logs; Ctrl+C to stop
  node .\server.js
  Pop-Location
} else {
  Write-Host "Skipped starting backend. You can start it manually: \n  cd $BackendDir\n  node .\\server.js" -ForegroundColor Yellow
}
