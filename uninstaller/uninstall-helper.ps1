#
for ($i=0; $i -le $args.Count - 1; $i++) {
 $folder += $args[$i] + " "
}
$timeStamp = $args[-1]

$vboxInstalled = Test-Path  $folder'\..\virtualbox'
$openjdkInstalled = Test-Path  $folder'\..\jdk8'

$devstudiofolder = $folder + '\..\devstudio';
$devstudioInstalled = Test-Path $devstudiofolder;

$cygwinfolder = $folder + '\..\cygwin';
$cygwinInstalled = Test-Path $cygwinfolder;

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

if ( $openJdkInstalled ) {
  echo 'Removing Red Hat OpenJDK'
  $vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*OpenJDK*'}
  msiexec /x $vbox.IdentifyingNumber /qb /norestart | Out-Null
  echo 'DONE'
}

if ($devstudioInstalled) {
  echo 'Removing shortcuts'
  [xml]$installConfig = Get-Content $devstudiofolder'\InstallConfigRecord-devstudio.xml';
  $shortcuts = $installConfig.AutomatedInstallation.'com.izforge.izpack.panels.ShortcutPanel'.shortcut.name;

  $desktop = [Environment]::GetFolderPath("Desktop");
  $programs = [Environment]::GetFolderPath("Programs");

  $shortcuts | % {
    if ((Test-Path $desktop'\'$_'.lnk')) {
      Remove-Item $desktop'\'$_'.lnk';
    } elseif (Test-Path $programs'\'$_) {
      Remove-Item -path \\?\$programs'\'$_ -Force -Recurse
    }
  }
  echo 'DONE'
}

if($cygwinInstalled) {
  $cygwinfolder = (Resolve-Path $cygwinfolder).Path;
  $publicDesktop = [Environment]::GetEnvironmentVariable("Public") + "\Desktop";
  $startMenu = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Cygwin";
  $shell = New-Object -ComObject WScript.Shell;

  if (-Not (Test-Path $startMenu)) {
    $startMenu = '';
  } 

  $shortcuts = Get-ChildItem -Path $publicDesktop,$startMenu "cygwin*.lnk";
  foreach($shortcut in $shortcuts) {
    $target = $shell.CreateShortcut($shortcut.FullName).TargetPath;
    if ($target -like "$cygwinfolder*") {
      Remove-Item -Force $shortcut.FullName;
    }
  }

  if (($startMenu.Length -gt 0) -and ((Get-ChildItem $startMenu | Measure-Object).Count -eq 0)) {
    Remove-Item -Force -Recurse $startMenu;
  }
}

$targetFolder = [System.IO.Path]::GetFullPath((Join-Path ($folder) '..'))

echo 'Removing installation folder'

$major = $PSVersionTable.PSVersion.Major
$minor = $PSVersionTable.PSVersion.Minor

if ("$major.$minor" -gt "5.0") {
  Remove-Item -path "\\?\$targetFolder" -Force -Recurse
} else {
  New-Item "$folder\..\temp" -type Directory -Force | Out-Null
  robocopy "$folder\..\temp" "$targetFolder" /purge | Out-Null
  Remove-Item -path "$targetFolder" -Force -Recurse
}

echo 'DONE'

echo 'Removing path entries'
[string[]] $pathFolders = [Environment]::GetEnvironmentVariable("Path", "User") -Split ';'
[Collections.ArrayList] $folderList = New-Object Collections.Arraylist

$pathFolders | foreach {
  If (-Not ($_ -like "$targetFolder*")) {
    $folderList.Add($_) | Out-Null
  }
}

[string] $delimitedFolders = $folderList -Join ';'
[Environment]::SetEnvironmentVariable("Path", $delimitedFolders, "User")

Remove-Item -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\DevelopmentSuite$timeStamp"

echo 'DONE'
#Write-Host "Press any key to exit"
#$key = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
