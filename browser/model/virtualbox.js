'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');
let execFile = require('remote').require('../main/util');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.version = version;
    this.revision = revision;
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'virtualBox-' + this.version + '.exe');

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading VirtualBox');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    let downloader = new Downloader(progress, success, failure);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setDesc('Installing VirtualBox');

    execFile(
      this.downloadedFile,
      ['--extract',
        '-path',
        this.installerDataSvc.tempDir(),
        '--silent'],
      () => {
        execFile(
          'msiexec',
          [
            '/i',
            this.msiFile,
            'INSTALLDIR=' + this.installerDataSvc.virtualBoxDir(),
            '/quiet',
            '/passive',
            '/norestart'
          ],
          () => {
            progress.setComplete("Complete");
            success();
          },
          () => {
            failure();
          }
        );
      },
      () => {
        failure();
      });
  }
}

export default VirtualBoxInstall;
