$timeStamp = $args[0]
$folder = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

Copy-Item $folder/uninstall-helper.ps1 $env:TEMP/uninstall-helper.ps1
cd ../..
# sign all shell scripts and replace ByPass to AllSigned
Start-Process powershell.exe -Verb runAs -ArgumentList "-ExecutionPolicy ByPass -File `"$env:TEMP\uninstall-helper.ps1`" $folder $timeStamp"
