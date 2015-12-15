'use strict';

let request = require('request');
let path = require('path');
let fs = require('fs');
let execFile = require('remote').require('../main/util');
let ipcRenderer = require('electron').ipcRenderer;

import JbdsAutoInstallGenerator from './jbds-autoinstall';
import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';

class JbdsInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super(downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), 'jbds.jar');
    this.installConfigFile = path.join(this.installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
    this.installGenerator = new JbdsAutoInstallGenerator(this.installerDataSvc.jbdsDir(), this.installerDataSvc.jdkDir());
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

    let data = this.installGenerator.fileContent();

    fs.writeFileSync(this.installConfigFile, data);

    let jdkInstall = this.installerDataSvc.getInstallable('jdk');

    if (jdkInstall !== undefined && jdkInstall.isInstalled()) {
      this.postJDKInstall(progress, success, failure);
    } else {
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'jdk') {
          this.postJDKInstall(progress, success, failure);
        }
      });
    }
  }

  postJDKInstall(progress, success, failure) {
    execFile(
      path.join(this.installerDataSvc.jdkDir(), 'bin', 'java.exe'),
      [
        '-jar',
        this.downloadedFile,
        this.installConfigFile
      ],
      () => {
        // Add CDK vagrantfile location to runtime server scan list
        fs.appendFile(
          path.join(this.installerDataSvc.jbdsDir(), 'studio', 'runtime_location.properties'),
          'CDKServer=' + this.installerDataSvc.cdkVagrantfileDir() + ',true',
          (err) => {
            if (err) throw err;

            progress.setComplete("Complete");
            success();
          }
        );
      },
      (err) => {
        failure(err);
      }
    );
  }
}

export default JbdsInstall;
