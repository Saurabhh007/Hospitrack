$ports = @(8000, 8080)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            $targetPid = $conn.OwningProcess
            if ($targetPid -and $targetPid -ne 0 -and $targetPid -ne $PID) {
                Write-Host "Releasing port $port (PID: $targetPid)..."
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}
