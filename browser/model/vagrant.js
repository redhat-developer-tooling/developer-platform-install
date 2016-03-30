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
    this.downloadedFileName = 'vagrant.msi';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
    this.detected = false;
    this.minimumVersion = "1.7.4";
    this.existingVersion = "";
  }

  static key() {
    return 'vagrant';
  }

  // Vagrant validation rules:
  // - cannot install vagrant if another one is already present in classpath
  // - minimal version reqired is 1.7.4 the same downloaded by installer
  // -
  isConfigured() {
    return this.existingVersion
        && this.existingInstallLocation
        && this.existingInstall
        && this.existingVersion >= this.minimumVersion
        || this.selected
        && this.existingInstallLocation === '';
  }

  detectExistingInstall(cb = new function(){}) {
    let versionRegex = /Vagrant*\s(\d+\.\d+\.\d+)/,
        command,
        directory,
        extension = '',
        subfolder = path.sep + 'bin';
    if (process.platform === 'win32') {
      command = 'where vagrant';
      extension = '.exe';
    } else {
      command = 'which vagrant';
    }

    Util.executeCommand(command, 1)
    .then((output) => {
      this.existingInstallLocation = path.dirname(path.dirname(output));
      return Util.executeCommand(output + ' -v', 1)
    }).then((output) => {
      this.existingVersion = versionRegex.exec(output)[1];
      this.existingInstall = true;
      this.detected = true;
      this.selected = false;
      cb();
    }).catch((error) => {
      this.existingInstall = false;
      cb(error);
    });
  }

  validateSelectedFolder(selection) {
    // should be called after path to vagrant changed
  }

  isDownloadRequired() {
    return !this.hasExistingInstall() && !fs.existsSync(this.bundledFile);
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    if(this.isDownloadRequired()) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      let downloadSize = 199819264;
      let downloader = new Downloader(progress, success, failure, downloadSize);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = this.bundledFile;
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
      installer.execFile('msiexec', [
        '/i',
        this.downloadedFile,
        'VAGRANTAPPDIR=' + this.installerDataSvc.vagrantDir(),
        '/qb!',
        '/norestart',
        '/Liwe',
        path.join(this.installerDataSvc.installDir(), 'vagrant.log')
      ]).then((result) => {
        return installer.writeFile(this.vagrantPathScript, data, result);
      })
      .then((result) => {
        return installer.execFile('powershell', args, result);
      })
      .then((result) => {
        return installer.exec('setx VAGRANT_DETECTED_OS "cygwin"');
      })
      .then((result) => {
        return installer.succeed(result);
      })
      .catch((error) => {
        if(error.code == 3010) {
          return installer.succeed(true);
        }
        return installer.fail(error);
      });
    } else {
      success();
    }
  }

  setup(progress, success, failure) {
    progress.setStatus('Setting up');
    progress.setComplete();
    success();
  }
}

export default VagrantInstall;
