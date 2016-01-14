'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';

class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Cygwin', 720, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'cygwin.exe');
    this.cygwinPathScript = path.join(this.installerDataSvc.tempDir(), 'set-cygwin-path.ps1');
  }

  static key() {
    return 'cygwin';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    let downloader = new Downloader(progress, success, failure);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CygwinInstall.key(), progress, success, failure);

    let opts = [
      '--no-admin',
      '--quiet-mode',
      '--only-site',
      '--site',
      'http://mirrors.kernel.org/sourceware/cygwin',
      '--root',
      this.installerDataSvc.cygwinDir(),
      '--categories',
      'Base',
      '--packages',
      'openssh,rsync'
    ];
    let data = [
      '$cygwinPath = "' + path.join(this.installerDataSvc.cygwinDir(), 'bin') + '"',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$cygwinPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');

    installer.execFile(this.downloadedFile, opts)
    .then((result) => { return installer.writeFile(this.cygwinPathScript, data, result); })
    .then((result) => { return installer.execFile('powershell',
      [
        '-ExecutionPolicy',
        'ByPass',
        '-File',
        this.cygwinPathScript
      ], result); })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }
}

export default CygwinInstall;
