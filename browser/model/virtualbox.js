'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');
let execFile = require('remote').require('../main/util');

import InstallableItem from './installable-item';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installRoot, tempDir, downloadUrl, installFile) {
    super(installRoot, tempDir, downloadUrl, installFile);

    this.version = version;
    this.revision = revision;
    this.downloadedFile = path.join(this.tempDir, 'virtualBox-' + this.version + '.exe');

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.tempDir, '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading VirtualBox ' + this.version);

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
    progress.setDesc('Installing VirtualBox ' + this.version);

    execFile(
      this.downloadedFile,
      ['--extract',
        '-path',
        this.tempDir,
        '--silent'],
      () => {
        execFile(
          'msiexec',
          [
            '/i',
            this.msiFile,
            'INSTALLDIR=' + path.join(this.installRoot, '/VirtualBox'),
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
