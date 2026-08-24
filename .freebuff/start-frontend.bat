@echo off
cd /d "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\web"
start "Helm Frontend" /min cmd /c "npx next dev > C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-51fc90ba-d0a9-41e5-af0b-be25a2e4f2d3.log 2> C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff\preview-51fc90ba-d0a9-41e5-af0b-be25a2e4f2d3.log.err"
