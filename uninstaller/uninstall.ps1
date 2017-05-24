$folder = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

Copy-Item $folder/uninstall-helper.ps1 $env:TEMP/uninstall-helper.ps1
cd ../..
Start-Process powershell.exe -ArgumentList $env:TEMP\uninstall-helper.ps1, $folder
