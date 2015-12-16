'use strict';

let unzip = require('unzip');
let request = require('request');
let path = require('path');
let fs = require('fs-extra');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Vagrant', downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'vagrant.zip');
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
  }

  static key() {
    return 'vagrant';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);
    let downloadSize = 188346368;

    let downloader = new Downloader(progress, success, failure, downloadSize);
    downloader.setWriteStream(writeStream);
    downloader.download(this.downloadUrl);
  }

  install(progress, success, failure) {
    progress.setStatus('Installing');

    Logger.info(VagrantInstall.key() + ' - Extract vagrant zip to ' + this.installerDataSvc.tempDir());

    fs.createReadStream(this.downloadedFile)
      .pipe(unzip.Extract({path: this.installerDataSvc.tempDir()}))
      .on('close', () => {
        Logger.info(VagrantInstall.key() + ' - Extract vagrant zip to ' + this.installerDataSvc.tempDir() + ' SUCCESS');

        let vagrantExploded = path.join(this.installerDataSvc.tempDir(), 'vagrant-distribution-1.7.4', 'windows-64');

        Logger.info(VagrantInstall.key() + ' - Move vagrant to ' + this.installerDataSvc.vagrantDir());

        fs.move(vagrantExploded, this.installerDataSvc.vagrantDir(), (err) => {
          if (err) {
            Logger.error(VagrantInstall.key() + ' - ' + err);
            return failure(err);
          }

          Logger.info(VagrantInstall.key() + ' - Move vagrant to ' + this.installerDataSvc.vagrantDir() + ' SUCCESS');

          // Set required paths
          let data = [
            '$vagrantPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'bin') + '"',
            '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
            '[Environment]::SetEnvironmentVariable("Path", "$vagrantPath;$oldPath", "User");',
            '[Environment]::Exit(0)'
          ].join('\r\n');

          Logger.info(VagrantInstall.key() + ' - Write vagrant path script to ' + this.vagrantPathScript);
          fs.writeFileSync(this.vagrantPathScript, data);
          Logger.info(VagrantInstall.key() + ' - Write vagrant path script to ' + this.vagrantPathScript + ' SUCCESS');

          Logger.info(VagrantInstall.key() + ' - Execute vagrant path script ' + this.vagrantPathScript);
          require('child_process')
            .execFile(
              'powershell',
              [
                '-ExecutionPolicy',
                'ByPass',
                '-File',
                this.vagrantPathScript
              ],
              (error, stdout, stderr) => {
                if (error && error != '') {
                  Logger.error(VagrantInstall.key() + ' - ' + error);
                  Logger.error(VagrantInstall.key() + ' - ' + stderr);
                  return failure(error);
                }

                if (stdout && stdout != '') {
                  Logger.info(VagrantInstall.key() + ' - ' + stdout);
                }
                Logger.info(VagrantInstall.key() + ' - Execute vagrant path script ' + this.vagrantPathScript + ' SUCCESS');

                progress.setComplete();
                success();
              }
            );
        });
      });
  }
}

export default VagrantInstall;
