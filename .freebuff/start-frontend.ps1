Set-Location "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\web"
$proc = Start-Process -FilePath 'node.exe' -ArgumentList 'node_modules\next\dist\bin\next','dev','-p','3456' -RedirectStandardOutput "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-51fc90ba-d0a9-41e5-af0b-be25a2e4f2d3.log" -RedirectStandardError "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-51fc90ba-d0a9-41e5-af0b-be25a2e4f2d3.log.err" -WindowStyle Hidden -PassThru
Write-Output $proc.Id
