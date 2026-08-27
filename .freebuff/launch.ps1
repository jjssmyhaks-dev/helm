$ErrorActionPreference = 'SilentlyContinue'
$dir = "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\web"
$log = "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-51fc90ba-d0a9-41e5-af0b-be25a2e4f2d3.log"
$logErr = "$log.err"
Remove-Item -Force $log -ErrorAction SilentlyContinue
Remove-Item -Force $logErr -ErrorAction SilentlyContinue
$proc = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $dir -RedirectStandardOutput $log -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
Write-Host "PID=$($proc.Id)"
