'use strict';

import fs from 'fs';
import request from 'request';
import path from 'path';

import execFile from './util.js';
import InstallableItem from './model';

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

  downloadInstaller(success, failure) {
    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    request
      .get(this.downloadUrl)
      .on('error', (err) => {
        writeStream.close();
        failure(err);
      })
      .on('response', (response) => {
        // TODO Send total size to UI
        console.log(response.headers['content-length']);
      })
      .on('data', (data) => {
        // TODO send updates to UI
        // console.log(data.length);
      })
      .on('end', () => {
        writeStream.end();
      })
      .pipe(writeStream)
      .on('close', () => {
        return success();
      });
  }

  install(success, failure) {
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
