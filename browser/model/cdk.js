'use strict';

let fs = require('fs-extra');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Platform from '../services/platform';
import Installer from './helpers/installer';

class CDKInstall extends InstallableItem {
  constructor(installerDataSvc, $timeout, minishiftUrl, cdkIsoUrl, ocUrl, fileName, targetFolderName, minishiftSha256, cdkIsoSha256, ocSha256,
    cdkIsoFilename, ocFilename) {
    super(CDKInstall.KEY, 900, minishiftUrl, fileName, targetFolderName, installerDataSvc, true);

    this.$timeout = $timeout;
    this.cdkIsoUrl = cdkIsoUrl;
    this.ocUrl = ocUrl;

    this.minishiftSha256 = minishiftSha256;
    this.cdkIsoSha256 = cdkIsoSha256;
    this.ocSha256 = ocSha256;

    this.boxName = cdkIsoFilename;
    this.cdkIsoDownloadedFile = path.join(this.downloadFolder, this.boxName);

    this.ocFileName = ocFilename;
    this.ocDownloadedFile = path.join(this.downloadFolder,   this.ocFileName);

    this.pscpPathScript = path.join(this.downloadFolder, 'set-pscp-path.ps1');

    this.addOption('install', '2.0.0', '', true);
    this.selected = false;
  }

  static get KEY() {
    return 'cdk';
  }

  detectExistingInstall(cb = function() {}) {
    cb();
  }

  downloadInstaller(progress, success, failure) {
    let totalDownloads = 3;
    this.downloader = new Downloader(progress, success, failure, totalDownloads);
    let username = this.installerDataSvc.getUsername();
    let password = this.installerDataSvc.getPassword();

    let cdkIsoBundledFile = path.join(this.bundleFolder, this.boxName);
    if(fs.existsSync(cdkIsoBundledFile)) {
      this.cdkIsoDownloadedFile = cdkIsoBundledFile;
      this.downloader.closeHandler();
    } else {
      this.checkAndDownload(
        this.cdkIsoDownloadedFile,
        this.cdkIsoUrl,
        this.cdkIsoSha256,
        username,
        password,
        progress
      );
    }

    if(fs.existsSync(this.bundledFile)) {
      this.downloadedFile = this.bundledFile;
      this.downloader.closeHandler();
    } else {
      this.checkAndDownload(
        this.downloadedFile,
        this.getDownloadUrl(),
        this.minishiftSha256,
        username,
        password,
        progress
      );
    }

    let ocBundledFile = path.join(this.bundleFolder, this.ocFileName);
    if(fs.existsSync(ocBundledFile)) {
      this.ocDownloadedFile = ocBundledFile;
      this.downloader.closeHandler();
    } else {
      this.checkAndDownload(
        this.ocDownloadedFile,
        this.ocUrl,
        this.ocSha256,
        undefined,
        undefined,
        progress
      );
    }
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CDKInstall.KEY, progress, success, failure);

    let opts = [
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      this.pscpPathScript
    ];
    let data = [
      '$newPath = "' + this.installerDataSvc.ocDir() + '";',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$newPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');
    let markerContent = [
      'openshift.auth.scheme=Basic',
      'openshift.auth.username=openshift-dev',
      'openshift.auth.password=devel',
      'oc.binary.path=' + this.installerDataSvc.ocDir(),
      'minishift.binary.path=' + this.installerDataSvc.ocDir(),
      'rhel.iso.binary.path=' + this.installerDataSvc.cdkBoxDir(),
      'rhel.subscription.username=' + this.installerDataSvc.getUsername()
    ].join('\r\n');
    let ocDir = this.installerDataSvc.ocDir();
    installer.unzip(this.downloadedFile, ocDir)
    .then(() => { return Platform.OS === 'win32' ? Promise.resolve(true) : installer.exec(`chmod +x ${ocDir}/minishift`); })
    .then((result) => { return installer.unzip(this.ocDownloadedFile, ocDir, result); })
    .then(() => { return Platform.OS === 'win32' ? Promise.resolve(true) : installer.exec(`chmod +x ${ocDir}/oc`); })
    .then((result) => { return installer.copyFile(this.cdkIsoDownloadedFile, path.join(this.installerDataSvc.cdkBoxDir(), this.boxName), result); })
    .then((result) => { return Platform.OS === 'win32' ? installer.writeFile(this.pscpPathScript, data, result) : Promise.resolve(true); })
    .then((result) => { return installer.writeFile(this.installerDataSvc.cdkMarker(), markerContent, result); })
    .then((result) => { return Platform.OS === 'win32' ? installer.execFile('powershell', opts, result) : Promise.resolve(true); })
    .then(() => { return Platform.OS === 'win32' ? Promise.resolve(true) : installer.exec(`rm -f /usr/local/bin/oc; ln -s ${ocDir}/oc /usr/local/bin/oc;`); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }
}

export default CDKInstall;
