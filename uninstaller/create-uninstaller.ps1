﻿
$targetLocation = $args[0]
$timeStamp = $args[1]
$versionString = $args[2]

$uninstallItem = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
$devsuiteItem =  "$uninstallItem\DevelopmentSuite$timeStamp"
$uninstallIcon = "$targetLocation\uninstaller\uninstall.ico"
# sign all shell scripts and replace ByPass to AllSigned
$uninstallString = "powershell -ExecutionPolicy ByPass -File $targetLocation\uninstaller\uninstall.ps1 $timeStamp"
$installDate = Get-Date -Format yyyyMMdd

New-Item -Path "$uninstallItem" -Name "DevelopmentSuite$timeStamp"
New-ItemProperty -Path $devsuiteItem -Name DisplayName -Value "Red Hat Development Suite"
New-ItemProperty -Path $devsuiteItem -Name DisplayVersion -Value $versionString
New-ItemProperty -Path $devsuiteItem -Name InstallLocation -Value $targetLocation
New-ItemProperty -Path $devsuiteItem -Name Comments -Value $targetLocation
New-ItemProperty -Path $devsuiteItem -Name NoRepair -PropertyType DWORD -Value 1
New-ItemProperty -Path $devsuiteItem -Name NoModify -PropertyType DWORD -Value 1
New-ItemProperty -Path $devsuiteItem -Name InstallDate -Value $installDate
New-ItemProperty -Path $devsuiteItem -Name Publisher -Value "RedHat, Inc."
New-ItemProperty -Path $devsuiteItem -Name UninstallString -Value $uninstallString
New-ItemProperty -Path $devsuiteItem -Name DisplayIcon -Value $uninstallIcon
