'use strict';

let AdmZip = require('adm-zip');
let request = require('request');
let path = require('path');
let fs = require('fs-extra');

import InstallableItem from './installable-item';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'vagrant.zip');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading Vagrant');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);
    let downloadSize = 0;
    let currentSize = 0;

    request
      .get(this.downloadUrl)
      .on('error', (err) => {
        writeStream.close();
        failure(err);
      })
      .on('response', (response) => {
        downloadSize = response.headers['content-length'];
      })
      .on('data', (data) => {
        currentSize += data.length;
        progress.setCurrent(Math.round((currentSize / downloadSize) * 100));
        progress.setLabel(progress.current + "%");
      })
      .on('end', () => {
        writeStream.end();
      })
      .pipe(writeStream)
      .on('close', () => {
        return success();
      });
  }

  install(progress, success, failure) {
    progress.setDesc('Installing Vagrant');

    let vagrantZip = new AdmZip(this.downloadedFile);
    vagrantZip.extractAllTo(this.installerDataSvc.tempDir(), true);

    let vagrantExploded = path.join(this.installerDataSvc.tempDir(), 'vagrant-distribution-master', 'windows-64');

    fs.move(vagrantExploded, this.installerDataSvc.vagrantDir(), (err) => {
      if (err) return failure(err);

      progress.setComplete("Complete");
      success();
    });
  }
}

export default VagrantInstall;
