'use strict';

let request = require('request');
let path = require('path');
let fs = require('fs');
let ipcRenderer = require('electron').ipcRenderer;

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Installer from './helpers/installer';
import Logger from '../services/logger';
import JdkInstall from './jdk-install';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('JBDS', 1600, downloadUrl, installFile);

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
    progress.setStatus('Downloading');

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
    progress.setStatus('Installing');
    let installer = new Installer(JbdsInstall.key(), progress, success, failure);

    Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content');
    let data = this.installGenerator.fileContent();
    Logger.info(JbdsInstall.key() + ' - Generate JBDS auto install file content SUCCESS');

    installer.writeFile(this.installConfigFile, data)
    .then((result) => { return this.postJDKInstall(installer, result);})
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }

  postJDKInstall(installer, result) {
    return new Promise((resolve, reject) => {
      let jdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());

      if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
        return this.headlessInstall(installer, result)
        .then((res) => { return resolve(res); })
        .catch((err) => { return reject(err); });
      } else {
        Logger.info(JbdsInstall.key() + ' - JDK has not finished installing, listener created to be called when it has.');
        ipcRenderer.on('installComplete', (event, arg) => {
          if (arg == JdkInstall.key()) {
            return this.headlessInstall(installer, result)
            .then((res) => { return resolve(res); })
            .catch((err) => { return reject(err); });
          }
        });
      }
    });
  }

  headlessInstall(installer, promise) {
    Logger.info(JbdsInstall.key() + ' - headlessInstall() called');
    let javaOpts = [
      '-jar',
      this.downloadedFile,
      this.installConfigFile
    ];
    let res = installer.execFile(path.join(this.installerDataSvc.jdkDir(), 'bin', 'java.exe'), javaOpts)
    .then((result) => { return this.setupCdk(result); });

    return res;
  }

  setupCdk(result) {
    Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location');
    return new Promise((resolve, reject) => {
      fs.appendFile(
        path.join(this.installerDataSvc.jbdsDir(), 'studio', 'runtime_location.properties'),
        'CDKServer=' + this.installerDataSvc.cdkVagrantfileDir() + ',true',
        (err) => {
          if (err) {
            Logger.error(JbdsInstall.key() + ' - ' + err);
            reject(err);
          } else {
            Logger.info(JbdsInstall.key() + ' - Append CDKServer runtime information to JBDS runtime location SUCCESS');
            resolve(true);
          }
        });
    });
  }
}

export default JbdsInstall;
