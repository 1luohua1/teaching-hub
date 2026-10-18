# ============================================================
# Auto sync & publish  (scheduled daily)
#   1. rebuild course page from source data (idempotent)
#   2. commit + push source repo  (d:\...\Scratch)
#   3. mirror page copy into hub repo, commit + push
#   4. verify GitHub Pages online
# Log: sync_log.txt (auto-trimmed)
# ============================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$hubRepo     = 'd:\小项目\教学总站'
$scratchRepo = 'd:\小项目\scrach\Scratch'
$buildDir    = Join-Path $scratchRepo '_构建脚本'
$mixlySrc    = 'd:\小项目\mixly\工作区总控台\static'
$logFile     = Join-Path $hubRepo 'sync_log.txt'
$hubUrl      = 'https://1luohua1.github.io/teaching-hub/'
$gitId       = @('-c', 'user.name=1luohua1', '-c', 'user.email=1luohua1@users.noreply.github.com')

function Log($msg) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  Write-Output $line
}

function Trim-Log {
  $f = Get-Item $logFile -ErrorAction SilentlyContinue
  if ($f -and $f.Length -gt 300KB) {
    $tail = Get-Content $logFile -Encoding UTF8 | Select-Object -Last 200
    Set-Content -Path $logFile -Value $tail -Encoding UTF8
  }
}

# returns $true if the repo was pushed
function Sync-GitRepo($repo, $msg) {
  # NOTE: git writes normal progress to stderr; with EAP=Stop PS5 would turn
  # those into terminating errors. Use Continue locally + exit-code checks.
  $ErrorActionPreference = 'Continue'
  Push-Location $repo
  try {
    $changed = @(git status --porcelain)
    if ($changed.Count -gt 0) {
      git add -A 2>&1 | Out-Null
      git @gitId commit -m $msg 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "git commit failed in $repo (code $LASTEXITCODE)" }
      Log ('{0}: committed {1} item(s)' -f $repo, $changed.Count)
    } else {
      Log ('{0}: no changes' -f $repo)
    }
    git pull --rebase origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git pull failed in $repo (code $LASTEXITCODE)" }
    $ahead = [int](git rev-list --count 'origin/main..main')
    if ($ahead -gt 0) {
      git push origin main 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "git push failed in $repo (code $LASTEXITCODE)" }
      Log ('{0}: pushed {1} commit(s)' -f $repo, $ahead)
      return $true
    }
    Log ('{0}: nothing to push' -f $repo)
    return $false
  } finally { Pop-Location }
}

try {
  Log '=== sync start ==='

  # 1. rebuild course page (no diff produced when data unchanged)
  Push-Location $buildDir
  py merge_lessons.py 2>&1 | Out-Null
  py build_page.py   2>&1 | Out-Null
  Pop-Location
  Log 'page rebuilt (merge_lessons + build_page)'

  # 2. source repo
  Sync-GitRepo $scratchRepo 'auto-sync: course page & content update' | Out-Null

  # 3. mirror copy into hub repo, then push hub
  Copy-Item (Join-Path $scratchRepo '00_最终交付\scratch课程体系预览.html') `
            (Join-Path $hubRepo 'scratch\index.html') -Force
  if (Test-Path $mixlySrc) {
    Copy-Item (Join-Path $mixlySrc '*') (Join-Path $hubRepo 'mixly\') -Force
  }
  $hubPushed = Sync-GitRepo $hubRepo 'auto-sync: mirror page copies'

  # 4. verify online (only right after a real push)
  if ($hubPushed) {
    Start-Sleep -Seconds 90
    try {
      $r = Invoke-WebRequest -Uri $hubUrl -UseBasicParsing -TimeoutSec 30
      Log ('pages check: HTTP {0}' -f $r.StatusCode)
    } catch {
      Log ('pages check: not ready yet ({0}) - will be live in a few minutes' -f $_.Exception.Message)
    }
  }

  Trim-Log
  Log '=== sync done ==='
} catch {
  Log ('ERROR: {0}' -f $_.Exception.Message)
  exit 1
}
