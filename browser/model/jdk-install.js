'use strict';

let unzip = require('unzip');
let fs = require('fs');
let path = require('path');
let request = require('request');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('JDK 8', downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'jdk8.zip');
  }

  checkForExistingInstall() {
  }

  static key() {
    return 'jdk';
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    let options = {
      url: this.downloadUrl,
      headers: {
        'Referer': 'http://www.azulsystems.com/products/zulu/downloads'
      }
    };

    let downloader = new Downloader(progress, success, failure);
    downloader.setWriteStream(writeStream);
    downloader.download(options);
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');

    this.extractZip(this.downloadedFile, this.installerDataSvc.installDir(), progress, success, failure);
  }

  extractZip(zipFile, extractTo, progress, success, failure) {
    Logger.info(JdkInstall.key() + ' - Extract zip to ' + extractTo);

    fs.createReadStream(zipFile)
      .pipe(unzip.Extract({path: extractTo}))
      .on('close', () => {
        Logger.info(JdkInstall.key() + ' - Extract zip to ' + extractTo + ' SUCCESS');

        this.renameExtractedZipContents(extractTo, this.installerDataSvc.jdkDir(), progress, success, failure);
      });
  }

  renameExtractedZipContents(extractTo, jdkDir, progress, success, failure) {
    Logger.info(JdkInstall.key() + ' - Rename extracted directory to ' + jdkDir);

    fs.readdir(extractTo, function(err, fileList) {
      if (err) {
        Logger.error(JdkInstall.key() + ' - ' + err);
        return failure(err);
      }

      for (let dirName of fileList) {
        if (dirName.startsWith('zulu')) {
          return fs.rename(path.join(extractTo, dirName), jdkDir, function(err) {
            if (err) {
              Logger.error(JdkInstall.key() + ' - ' + err);
              return failure(err);
            } else {
              Logger.info(JdkInstall.key() + ' - Rename extracted directory to ' + jdkDir + ' SUCCESS');

              progress.setComplete();
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
