Param(
  [string]$location
)

function Add-Path {
  <#
    .SYNOPSIS
      Adds a directory to the user's PATH environment variable
    .DESCRIPTION
      It takes Directory as parameter, checks if it is already in PATH and
      adds it if not present
    .EXAMPLE
      Add-Path -Directory "C:\Program Files\Notepad++"
    .PARAMETER Directory
     Directory's name to add to the user's PATH.
  #>

  [CmdletBinding()]
  param (
    [Parameter(
      Mandatory=$True,
      HelpMessage='Provide the directory you want to add to user''s PATH')]
    [Alias('dir')]
    [string[]]$Directory
  )

  $Path = [Environment]::GetEnvironmentVariable("Path", "User").Split(';')
  Write-Verbose "Removing duplicates from PATH value"
  $PathCopy = @()
  foreach ($Entry in $Path) {
    if(-not ($PathCopy -contains $Entry) -and (Test-Path $Entry)) {
      $PathCopy += $Entry
    }
  }

  if ($PathCopy -contains $Directory) {
    Write-Verbose "$Directory is already present in PATH"
  } else {
    if (-not (Test-Path $Directory)) {
      Write-Verbose "$Directory does not exist in the filesystem"
    } else {
      $Directory += $PathCopy
      $env:PATH = [String]::Join(';', $Directory)
      Write-Verbose "User's PATH value with directory added"
      Write-Verbose $env:PATH

      [Environment]::SetEnvironmentVariable("Path", $env:PATH, "User")
      [Environment]::Exit(0)
    }
  }
}

Add-Path -Directory $location -Verbose
