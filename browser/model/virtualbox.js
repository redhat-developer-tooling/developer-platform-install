'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';

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

  static key() {
    return 'virtualbox';
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

    Logger.info(VirtualBoxInstall.key() + ' - Extract virtualbox msi files');

    require('child_process')
      .execFile(
        this.downloadedFile,
        ['--extract',
          '-path',
          this.installerDataSvc.tempDir(),
          '--silent'],
        (error, stdout, stderr) => {
          if (error && error != '') {
            Logger.error(VirtualBoxInstall.key() + ' - ' + error);
            Logger.error(VirtualBoxInstall.key() + ' - ' + stderr);
            return failure(error);
          }

          if (stdout && stdout != '') {
            Logger.info(VirtualBoxInstall.key() + ' - ' + stdout);
          }
          Logger.info(VirtualBoxInstall.key() + ' - Extract virtualbox msi files SUCCESS');

          Logger.info(VirtualBoxInstall.key() + ' - Execute msi installer for virtualbox');
          require('child_process')
            .execFile(
              'msiexec',
              [
                '/i',
                this.msiFile,
                'INSTALLDIR=' + this.installerDataSvc.virtualBoxDir(),
                '/quiet',
                '/passive',
                '/norestart'
              ],
              (error, stdout, stderr) => {
                if (error && error != '') {
                  Logger.error(VirtualBoxInstall.key() + ' - ' + error);
                  Logger.error(VirtualBoxInstall.key() + ' - ' + stderr);
                  return failure(error);
                }

                if (stdout && stdout != '') {
                  Logger.info(VirtualBoxInstall.key() + ' - ' + stdout);
                }
                Logger.info(VirtualBoxInstall.key() + ' - Execute msi installer for virtualbox SUCCESS');

                progress.setComplete("Complete");
                success();
              }
            );
        }
      );
  }
}

export default VirtualBoxInstall;
