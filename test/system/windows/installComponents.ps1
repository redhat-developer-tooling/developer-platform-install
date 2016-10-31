Param(
  [string]$vagrant,
  [string]$java,
  [string]$cygwin,
  [string]$virtualbox
)

$ErrorActionPreference = "Stop";

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition;
$downloader = Join-Path $scriptPath 'downloadInstaller.ps1';

$vagrantUrl = 'https://releases.hashicorp.com/vagrant/';
$javaUrl = 'http://download-node-02.eng.bos.redhat.com/brewroot/packages/openjdk8-win/1.8.0.111/1.b15/win/java-1.8.0-openjdk-1.8.0.111-1.b15.redhat.windows.x86_64.msi';
$cygwinUrl = 'https://cygwin.com/setup-x86_64.exe';
$virtualboxUrl = 'http://download.virtualbox.org/virtualbox/';

function getVagrant($version) {
  if (-Not [string]::IsNullOrEmpty($version)) {
    echo 'Vagrant Installation'
    $fileName = 'vagrant_' + $version + '.msi';
    $url = $vagrantUrl + $version + '/' + $fileName;

    Invoke-Expression -Command "$downloader -url $url -output $fileName";
    uninstallMsi -name 'vagrant';
    installMsi -msiFile $fileName;
    
    $vagrantPath = "C:\HashiCorp\Vagrant\bin"
    $oldPath = [Environment]::GetEnvironmentVariable("PATH", "User");
    [Environment]::SetEnvironmentVariable("PATH", "$vagrant;$oldPath", "User");
    [Environment]::Exit(0);
  }
}

function getJava($version) {
  if (-Not [string]::IsNullOrEmpty($version)) {
    echo 'OpenJDK Installation'
    $fileName = 'java-1.8.0-openjdk-1.8.0.111-1.b15.redhat.windows.x86_64.msi';

    Invoke-Expression -Command "$downloader -url $javaUrl -output $fileName";
    uninstallMsi -name 'OpenJDK';
    installMsi -msiFile $fileName;

    $javaPath = "C:\Program Files\RedHat\java-1.8.0-openjdk-1.8.0.111-1\bin"
    $oldPath = [Environment]::GetEnvironmentVariable("PATH", "User");
    [Environment]::SetEnvironmentVariable("PATH", "$javaPath;$oldPath", "User");
    [Environment]::Exit(0);
  }
}

function getCygwin($version) {
  if (-Not [string]::IsNullOrEmpty($version)) {
    echo 'Cygwin Installation'
    $fileName = 'setup-x86_64.exe';
    $site = 'http://mirrors.xmission.com/cygwin';
    $root = 'c:\devsuite-test\cygwin';
    $packages = Join-Path $root 'packages'
    $arguments = '--no-admin --quiet-mode --only-site -l "' + $packages + '" --site "' + $site + '" --root "' + $root + '" --categories Base --packages openssh,rsync';
    
    Invoke-Expression -Command "$downloader -url $cygwinUrl -output $fileName";
    Start-Process -FilePath $fileName -ArgumentList $arguments -Wait;

    if (!$?) {
      throw "Cygwin installation failed";
    }
    
    $cygwinPath = Join-Path $root 'bin'
    $oldPath = [Environment]::GetEnvironmentVariable("PATH", "User");
    [Environment]::SetEnvironmentVariable("PATH", "$cygwinPath;$oldPath", "User");
    [Environment]::Exit(0);
  }
}

function getVirtualbox($version) {
  if (-Not [string]::IsNullOrEmpty($version)) {
    echo 'VirtualBox Installation'
    $versionRoot = $virtualboxUrl + $version + '/';
    $link = (Invoke-WebRequest -Uri $versionRoot).Links | where {$_.href -like "VirtualBox-$version-*-Win.exe"}
    $fileName = $link.href;
    $url = $versionRoot + $fileName;
    
    $build = $fileName | Select-String -Pattern '(?<=-)([0-9]+)(?=-)' | Select-Object -ExpandProperty Matches | Select-Object -ExpandProperty Value;
    $msiFile = 'VirtualBox-' + $version + '-r' + $build + '-MultiArch_amd64.msi';

    $arguments = "--extract --silent -path $scriptPath";

    Invoke-Expression -Command "$downloader -url $url -output $fileName";
    Start-Process -FilePath $fileName -ArgumentList $arguments -Wait
    
    if (!$?) {
      throw "Virtualbox installation failed";
    }

    uninstallMsi -name 'virtualbox';
    installMsi -msiFile $msiFile;
  }
}

function uninstallMsi($name) {
  $item = Get-WmiObject Win32_Product | where {$_.Name -like "*$name*"}

  if ($item) {
    echo "Cleaning up existing installation of "$item.Name;
    msiexec /x $item.IdentifyingNumber /qb /norestart | Out-Null;
  }
}

function installMsi($msiFile) {
  echo "installing $msiFile";
  msiexec /i $msiFile /qb /norestart | Out-Null;
  echo 'DONE';
}

getVagrant -version $vagrant;
getJava -version $java;
getVirtualbox -version $virtualbox;
getCygwin -version $cygwin;