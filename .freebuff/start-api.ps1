$apiDir = 'C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\api'
$logFile = 'C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\helm-api.log'
$logErr = 'C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\helm-api.log.err'
$tsxMjs = 'C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\node_modules\.pnpm\tsx@4.23.12\node_modules\tsx\dist\cli.mjs'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'node.exe'
$psi.Arguments = "`"$tsxMjs`" src/main.ts"
$psi.WorkingDirectory = $apiDir
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($psi)
Write-Output $proc.Id
