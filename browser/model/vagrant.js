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
import Version from './helpers/version';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName, sha256) {
    super('vagrant',
          'Vagrant',
          '1.7.4',
          'A container provisioning tool.',
          900,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.downloadedFileName = 'vagrant.msi';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
    this.detected = false;
    this.minimumVersion = "1.7.4";
    this.version = "1.7.4";
    this.existingVersion = "";
    this.sha256 = sha256;
  }

  static key() {
    return 'vagrant';
  }

  isSkipped() {
    let cdkInstall = this.installerDataSvc.getInstallable('cdk');
    let t = this.selectedOption == 'detected' && !this.hasOption('detected')
      || cdkInstall!==undefined && cdkInstall.isSkipped() && this.selectedOption !== 'install';
    return t;
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
      this.addOption('detected','',path.dirname(path.dirname(output)),false);
      return Util.executeCommand('"' + output + '"' + ' -v', 1)
    }).then((output) => {
      let version = versionRegex.exec(output)[1];
      this.option['detected'].version = version;
      this.selectedOption = 'detected';
      this.validateVersion();
      cb();
    }).catch((error) => {
      this.addOption('install',this.version,path.join(this.installerDataSvc.installRoot,'vagrant'),true);
      this.addOption('different','','',false);
      cb(error);
    });
  }

  validateVersion() {
    let installOption = this.option[this.selectedOption];
    installOption.valid = true;
    installOption.error = '';
    installOption.warning = '';
      if(Version.LT(installOption.version,this.minimumVersion)) {
        installOption.valid = false;
        installOption.error = 'oldVersion';
        installOption.warning = '';
      } else if(Version.GT(installOption.version,this.minimumVersion)) {
        installOption.valid = true;
        installOption.error = '';
        installOption.warning = 'newerVersion';
      }
  }

  validateSelectedFolder(selection) {
    // should be called after path to vagrant changed
  }

  isDownloadRequired() {
    return !this.hasExistingInstall() && !fs.existsSync(this.bundledFile);
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    if(this.isDownloadRequired() && this.selectedOption === "install") {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      let downloadSize = 199819264;
      this.downloader = new Downloader(progress, success, failure, downloadSize);
      this.downloader.setWriteStream(writeStream);
      this.downloader.download(this.downloadUrl,this.downloadedFile,this.sha256);
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
      progress.setStatus('Waiting for Cygwin to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'cygwin') {
          this.postCygwinInstall(progress, success, failure);
        }
      });
    }
  }

  postCygwinInstall(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === "install") {
      let installer = new Installer(VagrantInstall.key(), progress, success, failure);
      installer.execFile('msiexec', [
        '/i',
        this.downloadedFile,
        'VAGRANTAPPDIR=' + this.installerDataSvc.vagrantDir(),
        '/qb!',
        '/norestart',
        '/Liwe',
        path.join(this.installerDataSvc.installDir(), 'vagrant.log')
      ]).then((result) => {
        return installer.succeed(result);
      }).catch((error) => {
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
    let installer = new Installer(VagrantInstall.key(), progress, success, failure);
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
    installer.writeFile(this.vagrantPathScript, data)
    .then((result) => {
      return installer.execFile('powershell', args, result);
    }).then((result) => {
      return installer.exec('setx VAGRANT_DETECTED_OS "cygwin"');
    }).then((result) => {
      return installer.succeed(true);
    }).catch((result) => {
      return installer.fail(result);
    });

  }
}

export default VagrantInstall;
