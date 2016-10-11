param([string]$binary="./dist/win32-x64/devsuite-1.1.0-GA-bundle-installer.exe")

$myWindowsID=[System.Security.Principal.WindowsIdentity]::GetCurrent()
$myWindowsPrincipal=new-object System.Security.Principal.WindowsPrincipal($myWindowsID)
$adminRole=[System.Security.Principal.WindowsBuiltInRole]::Administrator

if (-Not $myWindowsPrincipal.IsInRole($adminRole)) {
  $newProcess = new-object System.Diagnostics.ProcessStartInfo "PowerShell";
  $arguments = '-ExecutionPolicy Bypass -file "' + $myInvocation.MyCommand.Definition + '" -binary ' + $binary;
  $newProcess.Arguments = $arguments;
  $newProcess.Verb = "runas";
  [System.Diagnostics.Process]::Start($newProcess);
  Write-Host "Re-running as admin"
  exit
} else {
  Write-Host "The current session is run as an admin"
}

$folder = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location -Path $folder

npm run system-test -- --binary $binary

$logs = $folder + '\..\..\..\logs';
New-Item -ItemType Directory -Force -Path $logs;
Get-ChildItem C:\DevelopmentSuite\ |
  Where-Object {$_.name -like "*.log"} |
  ForEach-Object { Copy-Item -Path $_.FullName -Destination $logs'\'$_ }
