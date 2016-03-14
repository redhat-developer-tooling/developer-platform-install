'use strict';

let path = require('path');
let fs = require('fs-extra');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import CygwinInstall from './cygwin';
import Util from './helpers/util';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile) {
    super('Vagrant', 900, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;
    this.downloadedFileName = 'vagrant.zip';
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
  }

  static key() {
    return 'vagrant';
  }

  checkForExistingInstall(selection, data) {
    let versionRegex = /Vagrant*\s(\d+\.\d+\.\d+)/;
    let command, directory;
    let extension = '';
    let subfolder = path.sep + 'bin';

    if (process.platform === 'win32') {
      command = 'where vagrant';
      extension = '.exe';
    } else {
      command = 'which vagrant';
    }
    if (selection) {
      this.existingInstallLocation = selection[0] || this.existingInstallLocation;
    }

    Util.executeCommand(command, 1)
    .then((output) => {
      return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
          return resolve(path.dirname(path.dirname(output)));
        } else {
          return Util.findText(output, 'VAGRANT_DIR=')
          .then((result) => { return resolve(result.split('=')[1].replace(/["]+/g, '')); });
        }
      });
    }).then((folder) => {
      return new Promise((resolve, reject) => {
        if (selection && folder !== selection[0] && folder !== selection[0] + path.sep) {
          return reject('selection is not on path');
        } else {
          directory = folder;
          resolve(directory);
        }
      });
    }).then((output) => {
      return Util.executeCommand(path.join(output + subfolder, 'vagrant' + extension) + ' -v', 1)
    }).then((output) => {
      this.existingVersion = versionRegex.exec(output)[1];
      this.existingInstall = true;
      if (selection && data) {
        data[VagrantInstall.key()][1] = true;
      } else {
        this.existingInstallLocation = directory;
      }
      ipcRenderer.send('checkComplete', VagrantInstall.key());
    }).catch((error) => {
      if (data) {
        data[VagrantInstall.key()][1] = false;
      }
      this.existingInstall = false;
      ipcRenderer.send('checkComplete', VagrantInstall.key());
    });
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    var downloads = path.normalize(path.join(__dirname,"../../.."));
    console.log(downloads);
    if(!this.hasExistingInstall() && !fs.existsSync(path.join(downloads, this.downloadedFileName))) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      let downloadSize = 199819264;

      let downloader = new Downloader(progress, success, failure, downloadSize);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = path.join(downloads, this.downloadedFileName);
      success();
    }
  }

  install(progress, success, failure) {
    let cygwinInstall = this.installerDataSvc.getInstallable(CygwinInstall.key());
    if( cygwinInstall !== undefined && cygwinInstall.isInstalled() ) {
      this.postCygwinInstall(progress, success, failure);
    } else {
      progress.setStatus('Waiting for  Cygwin to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'cygwin') {
          this.postCygwinInstall(progress, success, failure);
        }
      });
    }
  }

  postCygwinInstall(progress, success, failure) {
    progress.setStatus('Installing');
    if(!this.hasExistingInstall()) {
      let installer = new Installer(VagrantInstall.key(), progress, success, failure);

      let vagrantExploded = path.join(this.installerDataSvc.tempDir(), 'vagrant-distribution-1.7.4', 'windows-64');
      let data = [
        '$vagrantPath = "' + path.join(this.installerDataSvc.vagrantDir(), 'bin') + '"',
        '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
        '[Environment]::SetEnvironmentVariable("Path", "$vagrantPath;$oldPath", "User");',
        '[Environment]::Exit(0)'
      ].join('\r\n');
      let args = [
        '-ExecutionPolicy',
        'ByPass',
        '-File',
        this.vagrantPathScript
      ];

      installer.unzip(this.downloadedFile, this.installerDataSvc.tempDir())
          .then((result) => {
            return installer.moveFile(vagrantExploded, this.installerDataSvc.vagrantDir(), result);
          })
          .then((result) => {
            return installer.writeFile(this.vagrantPathScript, data, result);
          })
          .then((result) => {
            return installer.execFile('powershell', args, result);
          })
          //.then((result) => { return installer.exec('setx VAGRANT_DETECTED_OS "cygwin"'); })
          .then((result) => {
            return installer.succeed(result);
          })
          .catch((error) => {
            return installer.fail(error);
          });
    } else {
      success();
    }
  }

  setup(progress, success, failure) {
    progress.setStatus('Setting up');
    success();
  }
}

export default VagrantInstall;
