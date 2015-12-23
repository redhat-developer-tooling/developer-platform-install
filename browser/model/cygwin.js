'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';

class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Cygwin', 720, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'cygwin.exe');
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

    require('child_process')
      .execFile(
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
        (error, stdout, stderr) => {
          if (error && error != '') {
            Logger.error(CygwinInstall.key() + ' - ' + error);
            Logger.error(CygwinInstall.key() + ' - ' + stderr);
            return failure(error);
          }

          if (stdout && stdout != '') {
            Logger.info(CygwinInstall.key() + ' - ' + stdout);
          }

          progress.setComplete();
          success();
        }
      );
  }
}

export default CygwinInstall;
