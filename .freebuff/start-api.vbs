Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\apps\api"
WshShell.Run "node.exe ""C:\Users\Ashif\.openclaw-autoclaw\agents\lanework\workspace\lanework-next\helm\node_modules\.pnpm\tsx@4.23.12\node_modules\tsx\dist\cli.mjs"" src/main.ts", 0, False
