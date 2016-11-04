'use strict';

let path = require('path');
let fs = require('fs-extra');

import InstallableItem from './installable-item';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class VagrantInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName, sha256) {
    super(VagrantInstall.KEY, 900, downloadUrl, installFile, targetFolderName, installerDataSvc, false);

    this.downloadedFileName = 'vagrant.msi';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.vagrantPathScript = path.join(this.installerDataSvc.tempDir(), 'set-vagrant-path.ps1');
    this.detected = false;
    this.minimumVersion = "1.8.1";
    this.existingVersion = "";
    this.sha256 = sha256;
  }

  static get KEY() {
    return 'vagrant';
  }

  detectExistingInstall(cb = function(){}) {
    let versionRegex = /Vagrant*\s(\d+\.\d+\.\d+)/,
        command,
        directory,
        extension = '',
        subfolder = path.sep + 'bin';
    if (Platform.OS === 'win32') {
      command = 'where vagrant';
      extension = '.exe';
    } else {
      command = 'which vagrant';
    }

    let detectedPath = '';

    Util.executeCommand(command, 1)
    .then((output) => {
      let lines = output.split('\n');
      if (lines.length = 1) {
        detectedPath = lines[0];
      } else {
        for( let line of lines) {
          if(line.endsWith('.exe')) {
            detectedPath = line;
            break;
          }
        }
      }
      return Util.executeCommand('"' + detectedPath + '"' + ' -v', 1)
    }).then((output) => {
      let version = versionRegex.exec(output)[1];
      this.addOption('detected','',path.dirname(path.dirname(detectedPath)),false);
      this.option['detected'].version = version;
      this.selectedOption = 'detected';
      this.validateVersion();
      cb();
    }).catch((error) => {
      this.addOption('install',this.version,path.join(this.installerDataSvc.installRoot,'vagrant'),true);
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

  install(progress, success, failure) {
    if( !this.getInstallAfter() || this.getInstallAfter().isInstalled() ) {
      this.postCygwinInstall(progress, success, failure);
    } else {
      let name = this.getInstallAfter().productName;
      progress.setStatus(`Waiting for ${name} to finish installation`);
      this.ipcRenderer.on('installComplete', (event, arg) => {
        if (!this.isInstalled() && arg === this.getInstallAfter().keyName) {
          this.postCygwinInstall(progress, success, failure);
        }
      });
    }
  }

  postCygwinInstall(progress, success, failure) {
    progress.setStatus('Installing');
    if(this.selectedOption === "install") {
      let installer = new Installer(VagrantInstall.KEY, progress, success, failure);
      installer.execFile('msiexec', [
        '/i',
        this.downloadedFile,
        'VAGRANTAPPDIR=' + this.installerDataSvc.vagrantDir(),
        '/qn',
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
    let installer = new Installer(VagrantInstall.KEY, progress, success, failure);
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
      return installer.succeed(true);
    }).catch((result) => {
      return installer.fail(result);
    });
  }

}

export default VagrantInstall;
