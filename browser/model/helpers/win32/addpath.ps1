Param(
  [string]$location
)
$folder = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

Import-Module "$folder\addpath.psm1"

Add-Path -Directory $location -Verbose
