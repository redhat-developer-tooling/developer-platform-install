param(
[string]$folder = 'c:\DevelopmentSuite'
)
echo '(1/6) Removing VirtualBox'
$vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*VirtualBox*'}
msiexec /x $vbox.IdentifyingNumber /qb /norestart | Out-Null
echo 'DONE'

echo '(2/6) Removing VirtualBox VMs folder'
Remove-Item -Recurse $env:USERPROFILE'\VirtualBox VMs'
echo 'DONE'

echo '(3/6) Removing vagrant.d folder'
Remove-Item -Recurse $env:USERPROFILE'\.vagrant.d'
echo 'DONE'

echo '(4/6) Removing Vagrant'
$vagrant = Get-WmiObject Win32_Product | where {$_.Name -like '*Vagrant*'}
msiexec /x $vagrant.IdentifyingNumber /qb /norestart | Out-Null
echo 'DONE'

echo '(5/6) Removing the DevelopmentSuite installation folder'
Cmd /C "rmdir /S /Q $folder" | Out-Null
echo 'DONE'

echo '(6/6) Removing path entries'
[string[]] $pathFolders = [Environment]::GetEnvironmentVariable("Path", "User") -Split ';'
[Collections.ArrayList] $folderList = New-Object Collections.Arraylist

$pathFolders | foreach {
  If (-Not ($_ -like "$folder*")) {
    $folderList.Add($_) | Out-Null 
  }
}

[string] $delimitedFolders = $folderList -Join ';'
[Environment]::SetEnvironmentVariable("Path", $delimitedFolders, "User")

echo 'DONE'
$done = Read-Host 'Press any key to exit'
