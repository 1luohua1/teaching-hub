# Robotics content opener.
# Invoked by the rbopen: URL protocol registered in HKCU.
# The single argument is the full URI:  rbopen:<url-encoded-absolute-path>
# Opens the target with its default associated application (the "corresponding tool").
param([string]$uri)

if (-not $uri) { exit 1 }
if ($uri.StartsWith('rbopen:')) { $uri = $uri.Substring(7) }

try {
    $path = [System.Uri]::UnescapeDataString($uri)
} catch {
    $path = $uri
}

if (-not (Test-Path -LiteralPath $path)) {
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        [System.Windows.Forms.MessageBox]::Show("Cannot find file:`r`n$path", "Open failed", 'OK', 'Error') | Out-Null
    } catch {}
    exit 2
}

try {
    Start-Process -FilePath $path -ErrorAction Stop
} catch {
    try { Invoke-Item -LiteralPath $path } catch { exit 3 }
}
