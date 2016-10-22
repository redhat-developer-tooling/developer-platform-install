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
      ValueFromPipeline=$True,
      ValueFromPipelineByPropertyName=$True,
      HelpMessage='Provide the directory you want to add to user''s PATH')]
    [Alias('dir')]
    [string[]]$Directory
  )

  PROCESS {
    $Path = [Environment]::GetEnvironmentVariable("Path", "User").Split(';')
    Write-Verbose "User's PATH value"
    Write-Verbose  ([String]::Join(';', $Path))
    $PathCopy = "".split();
    foreach ($Entry in $Path) {
      if(-not ($PathCopy -contains $Entry) -and (Test-Path $Entry)) {
        $PathCopy += $Entry
      }
    }
    Write-Verbose "User's PATH value no duplicates"
    Write-Verbose ([String]::Join(';', $PathCopy))

    foreach ($dir in $Directory) {
      if ($PathCopy -contains $dir) {
        Write-Verbose "$dir is already present in PATH"
      } else {
        if (-not (Test-Path $dir)) {
          Write-Verbose "$dir does not exist in the filesystem"
        } else {
          $PathCopy += $dir
        }
      }
    }
    $env:PATH = [String]::Join(';', $PathCopy)
    Write-Verbose "User's PATH value with directory added"
    Write-Verbose $env:PATH

    [Environment]::SetEnvironmentVariable("Path", $env:PATH, "User")
    [Environment]::Exit(0)
  }
}
