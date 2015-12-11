'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');
let execFile = require('remote').require('../main/util');

import InstallableItem from './installable-item';
import Downloader from './handler/downloader';

class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'cygwin.exe');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading Cygwin');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    let downloader = new Downloader(progress, success, failure);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setDesc('Installing Cygwin');

    execFile(
      this.downloadedFile,
      [
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
      ],
      () => {
        progress.setComplete("Complete");
        success();
      },
      () => {
        failure();
      });
  }
}

export default CygwinInstall;
