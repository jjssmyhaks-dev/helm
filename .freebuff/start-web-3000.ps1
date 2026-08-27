Set-Location "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\web"
$logFile = "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-3000.log"
$proc = Start-Process -FilePath "node.exe" -ArgumentList "node_modules\next\dist\bin\next","dev","-p","3000" -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" -WindowStyle Hidden -PassThru
Write-Host $proc.Id
