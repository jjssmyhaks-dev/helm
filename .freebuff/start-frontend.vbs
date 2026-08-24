Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\.freebuff"
WshShell.Run "cmd /c start-frontend.bat", 0, False
