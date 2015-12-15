'use strict';

let request = require('request');
let path = require('path');
let fs = require('fs');
let ipcRenderer = require('electron').ipcRenderer;

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'jbds.jar');
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
    this.installGenerator = new JbdsAutoInstallGenerator(this.installerDataSvc.jbdsDir(), this.installerDataSvc.jdkDir());
  }

  static key() {
    return 'jbds';
  }

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setDesc('Downloading JBDS');

    // Need to download the file
    let writeStream = fs.createWriteStream(this.downloadedFile);

    let options = {
      url: this.downloadUrl,
      headers: {
        'Referer': 'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/'
      }
    };

    let downloader = new Downloader(progress, success, failure);
    downloader.setWriteStream(writeStream);
    downloader.download(options);
  }

  install(progress, success, failure) {
    progress.setDesc('Installing JBDS');

    Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content SUCCESS');

    Logger.info(JbdsInstall.key() + ' - Write JBDS auto install file to ' + this.installConfigFile);
    fs.writeFileSync(this.installConfigFile, data);
    Logger.info(JbdsInstall.key() + ' - Write JBDS auto install file to ' + this.installConfigFile + ' SUCCESS');

    let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());

    if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
      this.postJDKInstall(progress, success, failure);
    } else {
      Logger.info(JbdsInstall.key() + ' - JDK has not finished installing, listener created to be called when it has.');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == JdkInstall.key()) {
          this.postJDKInstall(progress, success, failure);
        }
      });
    }
  }

  postJDKInstall(progress, success, failure) {
    Logger.info(JbdsInstall.key() + ' - postJDKInstall() called');

    require('child_process')
      .execFile(
        path.join(this.installerDataSvc.jdkDir(), 'bin', 'java.exe'),
        [
          '-jar',
          this.downloadedFile,
          this.installConfigFile
        ],
        (error, stdout, stderr) => {
          if (error && error != '') {
            Logger.error(JbdsInstall.key() + ' - ' + error);
            Logger.error(JbdsInstall.key() + ' - ' + stderr);
            return failure(error);
          }

          if (stdout && stdout != '') {
            Logger.info(JbdsInstall.key() + ' - ' + stdout);
          }

          // Add CDK vagrantfile location to runtime server scan list
          Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location');

          fs.appendFile(
            path.join(this.installerDataSvc.jbdsDir(), 'studio', 'runtime_location.properties'),
            'CDKServer=' + this.installerDataSvc.cdkVagrantfileDir() + ',true',
            (err) => {
              if (err) {
                Logger.error(JbdsInstall.key() + ' - ' + err);
                return failure(err);
              }

              Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location SUCCESS');

              progress.setComplete("Complete");
              success();
            }
          );
        }
      );
  }
}

export default JbdsInstall;
