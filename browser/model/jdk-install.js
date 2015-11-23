'use strict';

let AdmZip = require('adm-zip');
let fs = require('fs');
let path = require('path');
let request = require('request');

import InstallableItem from './installable-item';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'jdk8.zip');
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading JDK 8');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);
    let downloadSize = 0;
    let currentSize = 0;

    let options = {
      url: this.downloadUrl,
      headers: {
        'Referer': 'http://www.azulsystems.com/products/zulu/downloads'
      }
    };

    request(options)
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
    progress.setDesc('Installing JDK 8');

    let jdkInstallationZip = new AdmZip(this.downloadedFile);
    jdkInstallationZip.extractAllTo(this.installerDataSvc.installDir(), true);

    let tempInstallRoot = this.installerDataSvc.installDir();
    let tempJdkRoot = this.installerDataSvc.jdkDir();

    fs.readdir(this.installerDataSvc.installDir(), function(err, fileList) {
      if (err) { failure(err); }

      for (let dirName of fileList) {
        if (dirName.startsWith('zulu')) {
          return fs.rename(tempInstallRoot + '/' + dirName, tempJdkRoot, function(err) {
            if (err) { failure(err); }
            else {
              progress.setComplete("Complete");
              success();
            }
          });
        } else {
          continue;
        }
      }
      failure('Extracted zip did not create directory with name starting "zulu"');
    });
  }
}

export default JdkInstall;
