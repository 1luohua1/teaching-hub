# Register / unregister the rbopen: URL protocol (HKCU, no admin needed).
# Mirrors the Scratch project's scratch3:/openppt: mechanism so that clicking a
# link in the robotics content page opens the file with its corresponding tool.
#   Register:   powershell -ExecutionPolicy Bypass -File register_rbopen.ps1
#   Unregister: powershell -ExecutionPolicy Bypass -File register_rbopen.ps1 -Unregister
param([switch]$Unregister)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ps1  = Join-Path $root "launch_file.ps1"
$cmd  = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ps1`" `"%1`""

$key = "HKCU:\Software\Classes\rbopen"

if ($Unregister) {
    Remove-Item $key -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "rbopen: protocol removed."
    exit 0
}

New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:Robotics Content Opener"
New-ItemProperty -Path $key -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null
New-Item -Path "$key\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$key\shell\open\command" -Name "(Default)" -Value $cmd
Write-Host "rbopen: protocol registered -> $ps1"
