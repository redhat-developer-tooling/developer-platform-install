#
$folder=$args[0]

$vboxInstalled = Test-Path  $folder'\..\virtualbox'
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

$subfolders = Get-ChildItem "$folder\.." -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }

if ($subfolders.Length -gt 0) {
  New-Item "$folder\..\temp" -type Directory -Force | Out-Null
  foreach ($item in $subfolders) {
    robocopy $folder\..\temp $item /purge | Out-Null
  }
  Get-ChildItem $folder\.. -Recurse | Remove-Item -Force
}

Remove-Item $folder\..

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
Write-Host "Press any key to exit"
$key = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# SIG # Begin signature block
# MIIYWgYJKoZIhvcNAQcCoIIYSzCCGEcCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQUY3I377WYsLCFKRRtWrnmi8rx
# MNGgghN1MIID7jCCA1egAwIBAgIQfpPr+3zGTlnqS5p31Ab8OzANBgkqhkiG9w0B
# AQUFADCBizELMAkGA1UEBhMCWkExFTATBgNVBAgTDFdlc3Rlcm4gQ2FwZTEUMBIG
# A1UEBxMLRHVyYmFudmlsbGUxDzANBgNVBAoTBlRoYXd0ZTEdMBsGA1UECxMUVGhh
# d3RlIENlcnRpZmljYXRpb24xHzAdBgNVBAMTFlRoYXd0ZSBUaW1lc3RhbXBpbmcg
# Q0EwHhcNMTIxMjIxMDAwMDAwWhcNMjAxMjMwMjM1OTU5WjBeMQswCQYDVQQGEwJV
# UzEdMBsGA1UEChMUU3ltYW50ZWMgQ29ycG9yYXRpb24xMDAuBgNVBAMTJ1N5bWFu
# dGVjIFRpbWUgU3RhbXBpbmcgU2VydmljZXMgQ0EgLSBHMjCCASIwDQYJKoZIhvcN
# AQEBBQADggEPADCCAQoCggEBALGss0lUS5ccEgrYJXmRIlcqb9y4JsRDc2vCvy5Q
# WvsUwnaOQwElQ7Sh4kX06Ld7w3TMIte0lAAC903tv7S3RCRrzV9FO9FEzkMScxeC
# i2m0K8uZHqxyGyZNcR+xMd37UWECU6aq9UksBXhFpS+JzueZ5/6M4lc/PcaS3Er4
# ezPkeQr78HWIQZz/xQNRmarXbJ+TaYdlKYOFwmAUxMjJOxTawIHwHw103pIiq8r3
# +3R8J+b3Sht/p8OeLa6K6qbmqicWfWH3mHERvOJQoUvlXfrlDqcsn6plINPYlujI
# fKVOSET/GeJEB5IL12iEgF1qeGRFzWBGflTBE3zFefHJwXECAwEAAaOB+jCB9zAd
# BgNVHQ4EFgQUX5r1blzMzHSa1N197z/b7EyALt0wMgYIKwYBBQUHAQEEJjAkMCIG
# CCsGAQUFBzABhhZodHRwOi8vb2NzcC50aGF3dGUuY29tMBIGA1UdEwEB/wQIMAYB
# Af8CAQAwPwYDVR0fBDgwNjA0oDKgMIYuaHR0cDovL2NybC50aGF3dGUuY29tL1Ro
# YXd0ZVRpbWVzdGFtcGluZ0NBLmNybDATBgNVHSUEDDAKBggrBgEFBQcDCDAOBgNV
# HQ8BAf8EBAMCAQYwKAYDVR0RBCEwH6QdMBsxGTAXBgNVBAMTEFRpbWVTdGFtcC0y
# MDQ4LTEwDQYJKoZIhvcNAQEFBQADgYEAAwmbj3nvf1kwqu9otfrjCR27T4IGXTdf
# plKfFo3qHJIJRG71betYfDDo+WmNI3MLEm9Hqa45EfgqsZuwGsOO61mWAK3ODE2y
# 0DGmCFwqevzieh1XTKhlGOl5QGIllm7HxzdqgyEIjkHq3dlXPx13SYcqFgZepjhq
# IhKjURmDfrYwggSjMIIDi6ADAgECAhAOz/Q4yP6/NW4E2GqYGxpQMA0GCSqGSIb3
# DQEBBQUAMF4xCzAJBgNVBAYTAlVTMR0wGwYDVQQKExRTeW1hbnRlYyBDb3Jwb3Jh
# dGlvbjEwMC4GA1UEAxMnU3ltYW50ZWMgVGltZSBTdGFtcGluZyBTZXJ2aWNlcyBD
# QSAtIEcyMB4XDTEyMTAxODAwMDAwMFoXDTIwMTIyOTIzNTk1OVowYjELMAkGA1UE
# BhMCVVMxHTAbBgNVBAoTFFN5bWFudGVjIENvcnBvcmF0aW9uMTQwMgYDVQQDEytT
# eW1hbnRlYyBUaW1lIFN0YW1waW5nIFNlcnZpY2VzIFNpZ25lciAtIEc0MIIBIjAN
# BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAomMLOUS4uyOnREm7Dv+h8GEKU5Ow
# mNutLA9KxW7/hjxTVQ8VzgQ/K/2plpbZvmF5C1vJTIZ25eBDSyKV7sIrQ8Gf2Gi0
# jkBP7oU4uRHFI/JkWPAVMm9OV6GuiKQC1yoezUvh3WPVF4kyW7BemVqonShQDhfu
# ltthO0VRHc8SVguSR/yrrvZmPUescHLnkudfzRC5xINklBm9JYDh6NIipdC6Anqh
# d5NbZcPuF3S8QYYq3AhMjJKMkS2ed0QfaNaodHfbDlsyi1aLM73ZY8hJnTrFxeoz
# C9Lxoxv0i77Zs1eLO94Ep3oisiSuLsdwxb5OgyYI+wu9qU+ZCOEQKHKqzQIDAQAB
# o4IBVzCCAVMwDAYDVR0TAQH/BAIwADAWBgNVHSUBAf8EDDAKBggrBgEFBQcDCDAO
# BgNVHQ8BAf8EBAMCB4AwcwYIKwYBBQUHAQEEZzBlMCoGCCsGAQUFBzABhh5odHRw
# Oi8vdHMtb2NzcC53cy5zeW1hbnRlYy5jb20wNwYIKwYBBQUHMAKGK2h0dHA6Ly90
# cy1haWEud3Muc3ltYW50ZWMuY29tL3Rzcy1jYS1nMi5jZXIwPAYDVR0fBDUwMzAx
# oC+gLYYraHR0cDovL3RzLWNybC53cy5zeW1hbnRlYy5jb20vdHNzLWNhLWcyLmNy
# bDAoBgNVHREEITAfpB0wGzEZMBcGA1UEAxMQVGltZVN0YW1wLTIwNDgtMjAdBgNV
# HQ4EFgQURsZpow5KFB7VTNpSYxc/Xja8DeYwHwYDVR0jBBgwFoAUX5r1blzMzHSa
# 1N197z/b7EyALt0wDQYJKoZIhvcNAQEFBQADggEBAHg7tJEqAEzwj2IwN3ijhCcH
# bxiy3iXcoNSUA6qGTiWfmkADHN3O43nLIWgG2rYytG2/9CwmYzPkSWRtDebDZw73
# BaQ1bHyJFsbpst+y6d0gxnEPzZV03LZc3r03H0N45ni1zSgEIKOq8UvEiCmRDoDR
# EfzdXHZuT14ORUZBbg2w6jiasTraCXEQ/Bx5tIB7rGn0/Zy2DBYr8X9bCT2bW+IW
# yhOBbQAuOA2oKY8s4bL0WqkBrxWcLC9JG9siu8P+eJRRw4axgohd8D20UaF5Mysu
# e7ncIAkTcetqGVvP6KUwVyyJST+5z3/Jvz4iaGNTmr1pdKzFHTx/kuDDvBzYBHUw
# ggVWMIIEPqADAgECAhAZGjLLdZyXuM+sEY3VEn9JMA0GCSqGSIb3DQEBCwUAMIHK
# MQswCQYDVQQGEwJVUzEXMBUGA1UEChMOVmVyaVNpZ24sIEluYy4xHzAdBgNVBAsT
# FlZlcmlTaWduIFRydXN0IE5ldHdvcmsxOjA4BgNVBAsTMShjKSAyMDA2IFZlcmlT
# aWduLCBJbmMuIC0gRm9yIGF1dGhvcml6ZWQgdXNlIG9ubHkxRTBDBgNVBAMTPFZl
# cmlTaWduIENsYXNzIDMgUHVibGljIFByaW1hcnkgQ2VydGlmaWNhdGlvbiBBdXRo
# b3JpdHkgLSBHNTAeFw0xNDAzMDQwMDAwMDBaFw0yNDAzMDMyMzU5NTlaMIGRMQsw
# CQYDVQQGEwJVUzEdMBsGA1UEChMUU3ltYW50ZWMgQ29ycG9yYXRpb24xHzAdBgNV
# BAsTFlN5bWFudGVjIFRydXN0IE5ldHdvcmsxQjBABgNVBAMTOVN5bWFudGVjIENs
# YXNzIDMgRXh0ZW5kZWQgVmFsaWRhdGlvbiBDb2RlIFNpZ25pbmcgQ0EgLSBHMjCC
# ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAYAu7too0IWGMPJtfdInuI
# 9uTH7DsmGHjTx6QgU42DfKU/fqXIK0ffDfWm2cMdJZNgz3zc6gMsvnh/XEhtpwLZ
# Sfih6+uaYXyfwCbW3BXYuBB8ILpe9Cj2qOqnXHzGnJCQNDy2Iqz+ugw6HtZehLZb
# 8KOBcHiKjUZSe/zbSfMpExF0T40Ws8LjoC3HAwSdzMNy4Q4M+wKO8SYXe26u+Lcz
# i6ZhS0Xf8iVEx/ewmCM23Ch5Cuibcoio2Oiue38KZEWl8FeSmncGRR7rn+hm83p9
# koFfAC0euPZWE1piDbdHoY9y74NeguCUmOGspa2GN+Cn07qxPnrrRajxwUR94gMC
# AwEAAaOCAW0wggFpMBIGA1UdEwEB/wQIMAYBAf8CAQAwLwYDVR0fBCgwJjAkoCKg
# IIYeaHR0cDovL3Muc3ltY2IuY29tL3BjYTMtZzUuY3JsMBYGA1UdJQEB/wQMMAoG
# CCsGAQUFBwMDMA4GA1UdDwEB/wQEAwIBBjAuBggrBgEFBQcBAQQiMCAwHgYIKwYB
# BQUHMAGGEmh0dHA6Ly9zLnN5bWNkLmNvbTBfBgNVHSAEWDBWMFQGBFUdIAAwTDAj
# BggrBgEFBQcCARYXaHR0cHM6Ly9kLnN5bWNiLmNvbS9jcHMwJQYIKwYBBQUHAgIw
# GRoXaHR0cHM6Ly9kLnN5bWNiLmNvbS9ycGEwKQYDVR0RBCIwIKQeMBwxGjAYBgNV
# BAMTEVN5bWFudGVjUEtJLTEtNjI5MB0GA1UdDgQWBBQWZt5KNONQpxGGA7Fsqcas
# zVlumzAfBgNVHSMEGDAWgBR/02Wnwt3su/AwCfNDOfoCrzMxMzANBgkqhkiG9w0B
# AQsFAAOCAQEAP1sZ8/oT1XU4Klrun1qgTKkdxcyU7t4V/vUQbqQbpWSDVBhYxAso
# oYXDTnTl/4l8/tXtPLpxn1YCJo8WKoj+sKMnIs5L4jiOAKY6hl+d5T6o3mRJQXRB
# If0HyIQX2h1lMILLJk851gQnpIGxS0nDI4t+AjIYJ7erC/MYcrak7mcGbzimWI3g
# 8X5dpGDGqOVQX+DouuKPmVi2taCodvGi8RyIQXJ+UpebCjaZjVD3Aes85/AiauU1
# jGM2ihqx2WdmX5ca76ggnfAvumzO2ZSFAPFY8X3JfCK1B10CxuYLv6uTk/8nGI4z
# Nn5XNPHDrwTBhPFWs+iHgzb40wox3G4sbTCCBX4wggRmoAMCAQICEH/wHO8YB1SI
# 9VNMEcGuit4wDQYJKoZIhvcNAQELBQAwgZExCzAJBgNVBAYTAlVTMR0wGwYDVQQK
# ExRTeW1hbnRlYyBDb3Jwb3JhdGlvbjEfMB0GA1UECxMWU3ltYW50ZWMgVHJ1c3Qg
# TmV0d29yazFCMEAGA1UEAxM5U3ltYW50ZWMgQ2xhc3MgMyBFeHRlbmRlZCBWYWxp
# ZGF0aW9uIENvZGUgU2lnbmluZyBDQSAtIEcyMB4XDTE1MDcwODAwMDAwMFoXDTE4
# MDcwNzIzNTk1OVowgckxEzARBgsrBgEEAYI3PAIBAxMCVVMxGTAXBgsrBgEEAYI3
# PAIBAhQIRGVsYXdhcmUxHTAbBgNVBA8TFFByaXZhdGUgT3JnYW5pemF0aW9uMRAw
# DgYDVQQFEwcyOTQ1NDM2MQswCQYDVQQGEwJVUzEXMBUGA1UECAwOTm9ydGggQ2Fy
# b2xpbmExEDAOBgNVBAcMB1JhbGVpZ2gxFjAUBgNVBAoMDVJlZCBIYXQsIEluYy4x
# FjAUBgNVBAMUDVJlZCBIYXQsIEluYy4wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
# ggEKAoIBAQDDVD3GeGk9I55gcFG+4KzsvDK/wuTnaa7+IH3dFFmbTH00E7cZCw+h
# cSHv1sQjwQyStc1d9+OKnMDClDyk++wO5qE/4xmp2DRcfbcFSX1+6PNyjugyl6uI
# 7CRPvpYmGghEo4NSpdcXCoCBmZZ//qPkxCw3g1Wv1pIwb7bI1h7GEtpP3/qv624Y
# VAcMW+fYzZkOMTJJ2rdNvbQvhQmZNClMq+Aao5KWelyjVdFLr0tTvIPPl2ORT1Ko
# pByn2beF559QpS7xs5FNypZorMPkgqC7YnbTXK5rhPYtQaXQJpOiImoP+38CbfCR
# FV+F7pVP910oCQW3SDZAQ1bKEFpP5DKVAgMBAAGjggGWMIIBkjAuBgNVHREEJzAl
# oCMGCCsGAQUFBwgDoBcwFQwTVVMtREVMQVdBUkUtMjk0NTQzNjAJBgNVHRMEAjAA
# MA4GA1UdDwEB/wQEAwIHgDArBgNVHR8EJDAiMCCgHqAchhpodHRwOi8vc3cuc3lt
# Y2IuY29tL3N3LmNybDBmBgNVHSAEXzBdMFsGC2CGSAGG+EUBBxcGMEwwIwYIKwYB
# BQUHAgEWF2h0dHBzOi8vZC5zeW1jYi5jb20vY3BzMCUGCCsGAQUFBwICMBkMF2h0
# dHBzOi8vZC5zeW1jYi5jb20vcnBhMBYGA1UdJQEB/wQMMAoGCCsGAQUFBwMDMB8G
# A1UdIwQYMBaAFBZm3ko041CnEYYDsWypxqzNWW6bMB0GA1UdDgQWBBQikW9n8gVj
# TUoBau/v13ZXN9dHLDBYBggrBgEFBQcBAQRMMEowHwYIKwYBBQUHMAGGE2h0dHA6
# Ly9zdy5zeW1jZC5jb20wJwYIKwYBBQUHMAKGG2h0dHA6Ly9zdzEuc3ltY2IuY29t
# L3N3LmNydDANBgkqhkiG9w0BAQsFAAOCAQEArI+NEUO8cLqMboE3a0JSQVaoWGoz
# 5+yjKWgKdZXhP668qXPK5d/1lGiXagby2z9SnszQuCiKlOfUT6P1ZKqKMNh5nQNf
# fKrxdJs/0lWCJQkom1oP2zdLK/sYgjg3LQ3ZNN6ImBK98HpMMF+EJkwCWBoTnZS/
# QV2T0E4BuuwHhGCjV8bqNN6DPC+WzFUlxjSlHuk8BRdKXA73CtVMjE0tOFJkXsj3
# 07/bSPxH0hOGTHFQVjv4ZlIhXSFD+WbErM/q/6Dz6XATcvgOpX25K8VNzRUomFAH
# /v3F0TpXgdh5zwWBLVLGTWOAVixw3rRYB2hIc3uA13Ogic2xy4+ExTi4NTGCBE8w
# ggRLAgEBMIGmMIGRMQswCQYDVQQGEwJVUzEdMBsGA1UEChMUU3ltYW50ZWMgQ29y
# cG9yYXRpb24xHzAdBgNVBAsTFlN5bWFudGVjIFRydXN0IE5ldHdvcmsxQjBABgNV
# BAMTOVN5bWFudGVjIENsYXNzIDMgRXh0ZW5kZWQgVmFsaWRhdGlvbiBDb2RlIFNp
# Z25pbmcgQ0EgLSBHMgIQf/Ac7xgHVIj1U0wRwa6K3jAJBgUrDgMCGgUAoHAwEAYK
# KwYBBAGCNwIBDDECMAAwGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQwHAYKKwYB
# BAGCNwIBCzEOMAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFEcMfGJzGGLi
# QSmszYJrxIIShlozMA0GCSqGSIb3DQEBAQUABIIBABEDRIWVb4G0y5xS/07tgBiW
# fsDoxuBOuau25w3OXrNkYhd08ARLF9oVv0DnVSYZ7Z5zKPusK2Jl88/XwWXL1Jts
# MuxYl37odNcFqHx8uIMbXPvlmRVOi0N/dotUZ8zWZ6vREQMoex9wUFDcB5BPi0P0
# dtt3hdQdBRgVheMWhqWdECCnsPoQ6i1BtoWtWw5aIGFhvq9m7kMge52noci4oJGE
# t2lKMJ5jjFY6YqsDdO7Tp3vVcJeYulQfT061PpMZ8tM/dv3Q7fCPLVdQFgZnqvct
# avDxz0gPeD/GyWzxjAOVmsMu/984FmD9RHwzXlV3LPxa6lSXSklTCTg69ScdSpmh
# ggILMIICBwYJKoZIhvcNAQkGMYIB+DCCAfQCAQEwcjBeMQswCQYDVQQGEwJVUzEd
# MBsGA1UEChMUU3ltYW50ZWMgQ29ycG9yYXRpb24xMDAuBgNVBAMTJ1N5bWFudGVj
# IFRpbWUgU3RhbXBpbmcgU2VydmljZXMgQ0EgLSBHMgIQDs/0OMj+vzVuBNhqmBsa
# UDAJBgUrDgMCGgUAoF0wGAYJKoZIhvcNAQkDMQsGCSqGSIb3DQEHATAcBgkqhkiG
# 9w0BCQUxDxcNMTcwNTI2MDIxNDQwWjAjBgkqhkiG9w0BCQQxFgQUqlEDbK5Skyxg
# FtXv8ww8B6iSQK8wDQYJKoZIhvcNAQEBBQAEggEAD4TClg3zVFULL0AA0vodsD80
# 7UsqKqp3Pz455arUQj9lw+R2iR+N2eEGozR3y86NKriEnBbucWe8dXWmBDwrfJn7
# rFHfpRKSrcG0+JJkSeKs46XydJIVsjDkUf7HKIlmBBPnLSII90yPe1Lxri8KbqO9
# H1fV0P3i3gA4vg/OxVDBP0sjmCHLw+i4n1J8YmkrgIR6Qkd+f+PQs36Gdnw34l3+
# WdMxRimqrR3V2E+rI2D2h9eIiFBI370twDE0ATj6pzU7NsSZf6rTPHaOUA4SnJ7Z
# r/i1iZxuBQefg3Y7APdA7O81roFlUrOiyUphKRADRH26EZ/F/21LOEjoVgD0Xw==
# SIG # End signature block
