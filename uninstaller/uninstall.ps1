#
$folder = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

$vboxInstalled = Test-Path  $folder'\..\virtualbox'
$vagrantInstalled = Test-Path  $folder'\..\vagrant'
$openjdkInstalled = Test-Path  $folder'\..\jdk8'

$devstudiofolder = $folder + '\..\developer-studio';
$devstudioInstalled = Test-Path $devstudiofolder;

echo 'Uninstalling Red Hat Development Suite'

if ( $vboxInstalled ) {
  echo 'Removing VirtualBox'
  $vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*VirtualBox*'}
  msiexec /x $vbox.IdentifyingNumber /qb /norestart | Out-Null
  echo 'DONE'

  $vboxVmsExists = Test-Path $env:USERPROFILE'\VirtualBox VMs'
  if($vboxVmsExists) {
      echo 'Removing VirtualBox VMs folder'
      Remove-Item -Recurse $env:USERPROFILE'\VirtualBox VMs'
      echo 'DONE'
  }
}

if( $vagrantInstalled ) {
  echo 'Removing Vagrant'
  $vagrant = Get-WmiObject Win32_Product | where {$_.Name -like '*Vagrant*'}
  msiexec /x $vagrant.IdentifyingNumber /qb /norestart | Out-Null
  echo 'DONE'

  $vagrantDExists = Test-Path $env:USERPROFILE'\.vagrant.d'
  if($vagrantDExists){
    echo 'Removing vagrant.d folder'
    Remove-Item -Recurse $env:USERPROFILE'\.vagrant.d'
    echo 'DONE'
  }
}

if ( $openJdkInstalled ) {
  echo 'Removing Red Hat OpenJDK'
  $vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*OpenJDK*'}
  msiexec /x $vbox.IdentifyingNumber /qb /norestart | Out-Null
  echo 'DONE'
}

if ($devstudioInstalled) {
  echo 'Removing shortcuts'
  [xml]$installConfig = Get-Content $devstudiofolder'\InstallConfigRecord.xml';
  $shortcuts = $installConfig.AutomatedInstallation.'com.izforge.izpack.panels.ShortcutPanel'.shortcut.name;

  $desktop = [Environment]::GetFolderPath("Desktop");
  $programs = [Environment]::GetFolderPath("Programs");

  $shortcuts | % {
    if ((Test-Path $desktop'\'$_'.lnk')) {
      Remove-Item $desktop'\'$_'.lnk';
    } elseif (Test-Path $programs'\'$_) {
      Remove-Item $programs'\'$_ -Recurse;
    }
  }
  echo 'DONE'
}

echo 'Removing installation folder'
Cmd /C "rmdir /S /Q $folder\.." | Out-Null
echo 'DONE'

echo 'Removing path entries'
[string[]] $pathFolders = [Environment]::GetEnvironmentVariable("Path", "User") -Split ';'
[Collections.ArrayList] $folderList = New-Object Collections.Arraylist

$targetFolder = [System.IO.Path]::GetFullPath((Join-Path ($folder) '..'))

$pathFolders | foreach {
  If (-Not ($_ -like "$targetFolder*")) {
    $folderList.Add($_) | Out-Null
  }
}

[string] $delimitedFolders = $folderList -Join ';'
[Environment]::SetEnvironmentVariable("Path", $delimitedFolders, "User")

echo 'DONE'
$done = Read-Host 'Press any key to exit'
