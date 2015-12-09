'use strict';

let unzip = require('unzip');
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

    request.get(options)
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

    this.extractZip(this.downloadedFile, this.installerDataSvc.installDir(), progress, success, failure);
  }

  extractZip(zipFile, extractTo, progress, success, failure) {
    fs.createReadStream(zipFile)
      .pipe(unzip.Extract({path: extractTo}))
      .on('close', () => {
        this.renameExtractedZipContents(extractTo, this.installerDataSvc.jdkDir(), progress, success, failure);
      });
  }

  renameExtractedZipContents(extractTo, jdkDir, progress, success, failure) {
    fs.readdir(extractTo, function(err, fileList) {
      if (err) { failure(err); }

      for (let dirName of fileList) {
        if (dirName.startsWith('zulu')) {
          return fs.rename(path.join(extractTo, dirName), jdkDir, function(err) {
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
