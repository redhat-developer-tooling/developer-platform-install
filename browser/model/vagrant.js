'use strict';

let path = require('path');
let fs = require('fs-extra');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Vagrant', 900, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'vagrant.zip');
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
  }

  static key() {
    return 'vagrant';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);
    let downloadSize = 199819264;

    let downloader = new Downloader(progress, success, failure, downloadSize);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(VagrantInstall.key(), progress, success, failure);

    let vagrantExploded = path.join(this.installerDataSvc.tempDir(), 'vagrant-distribution-1.7.4', 'windows-64');
    let data = [
      '$vagrantPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'bin') + '"',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$vagrantPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');
    let args = [
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      this.vagrantPathScript
    ];

    installer.unzip(this.downloadedFile, this.installerDataSvc.tempDir())
    .then((result) => { return installer.moveFile(vagrantExploded, this.installerDataSvc.vagrantDir(), result); })
    .then((result) => { return installer.writeFile(this.vagrantPathScript, data, result); })
    .then((result) => { return installer.execFile('powershell', args, result); })
    .then((result) => { return installer.exec('setx VAGRANT_DETECTED_OS "cygwin"'); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }
}

export default VagrantInstall;
