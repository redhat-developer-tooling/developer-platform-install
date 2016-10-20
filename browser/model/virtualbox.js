'use strict';

let fs = require('fs-extra');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, installFile, targetFolderName, sha256) {
    super('virtualbox',
          700,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc,
          false);

    this.minimumVersion = '5.0.26';
    this.version = version || '5.0.26';
    this.maximumVersion = '5.1.0';
    this.revision = revision;
    this.downloadedFileName = 'virtualbox.exe';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
    this.sha256 = sha256;
  }

  static key() {
    return 'virtualbox';
  }

  detectExistingInstall(cb = new function(){}) {
    let versionRegex = /(\d+\.\d+\.\d+)r\d+/;
    let command;
    let extension = '';
    let directory;

    if (process.platform === 'win32') {
      command = 'echo %VBOX_INSTALL_PATH%';
      extension = '.exe';
    } else {
      command = 'which virtualbox';
    }

    let tempDetectedLocation = '';

    Util.executeCommand(command, 1).then((output) => {
      return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
          if (output === '%VBOX_INSTALL_PATH%') {
            return Util.executeCommand('echo %VBOX_MSI_INSTALL_PATH%', 1).then((output)=>{
                resolve(output);
            });
          } else {
	           resolve(output);
          }
        } else {
          return Util.findText(output, 'INSTALL_DIR=').then((result) => {
            return resolve(result.split('=')[1]);
          }).catch((error)=>{
            return resolve(path.parse(output).dir);
          });
        }
      });
     }).then((output) => {
      // with VBox 5.0.8 or later installed in C:\Program Files\Oracle\VirtualBox, output = C:\Program Files\Oracle\VirtualBox
      if(output === '%VBOX_MSI_INSTALL_PATH%') {
        return Util.executeCommand('where VirtualBox', 1);
      } else {
        // this ensures that by default the previous install is selected for reuse
        // to detect previous install, but NOT use the existing install, `return resolve(output);` here instead
        return new Promise((resolve, reject) => {
          resolve(output);
        });
      }
    }).then((output) => {
      return new Promise((resolve, reject) => {
        tempDetectedLocation = output;
        resolve(output);
      });
    }).then((output) => {
      return Util.folderContains(output, ['VirtualBox' + extension, 'VBoxManage' + extension])
    }).then((output) => {
      var command = '"' + path.join(output, 'VBoxManage' + extension) +'"' + ' --version';
      return Util.executeCommand(command, 1);
    }).then((output) => {
      let version = versionRegex.exec(output)[1];
      this.addOption('detected',version,tempDetectedLocation,Version.GE(version,this.minimumVersion));
      this.selectedOption = 'detected';
      this.validateVersion();
      cb();
    }).catch((error) => {
      this.addOption('install',this.version,path.join(this.installerDataSvc.installRoot,'virtualbox'),true);
      this.addOption('different','','',false);
      cb();
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
      } else if(Version.GT(installOption.version,this.minimumVersion) && Version.LT(installOption.version,this.maximumVersion)) {
        installOption.valid = true;
        installOption.error = '';
        installOption.warning = 'newerVersion';
      } else if(Version.GE(installOption.version,this.maximumVersion)) {
        installOption.valid = false;
        installOption.error = '';
        installOption.warning = 'newerVersion';
      }
  }

  validateSelectedFolder(selection) {
    // should be called after path to vagrant changed
  }

  install(progress, success, failure) {
    if( !this.getInstallAfter() || this.getInstallAfter().isInstalled() ) {
      this.postOpenJdk(progress, success, failure);
    } else {
      let name = this.getInstallAfter().productName;
      progress.setStatus(`Waiting for ${name} to finish installation`);
      this.ipcRenderer.on('installComplete', (event, arg) => {
        if (!this.isInstalled() && arg === this.getInstallAfter().keyName) {
          this.postOpenJdk(progress, success, failure);
        }
      });
    }
  }

  postOpenJdk(progress, success, failure) {
    let installer = new Installer(VirtualBoxInstall.key(), progress, success, failure);
    if(this.selectedOption === "install") {
      installer.execFile(this.downloadedFile,
        ['--extract',
          '-path',
          this.installerDataSvc.tempDir(),
          '--silent'])
        .then((result) => {
          return this.configure(installer, result)
        })
        .then((result) => {
          return installer.succeed(result);
        })
        .catch((error) => {
          return installer.fail(error);
        });
    } else {
      success();
    }
  };

  setup(progress, success, failure) {
    //no need to setup anything for vbox
    progress.setStatus('Setting up');
    progress.setComplete();
    success();
  }

  configure(installer, result) {
    return new Promise((resolve, reject) => {
      // If downloading is not finished wait for event
      if (this.installerDataSvc.downloading) {
        Logger.info(VirtualBoxInstall.key() + ' - Waiting for all downloads to complete');
        installer.progress.setStatus('Waiting for all downloads to finish');
        this.ipcRenderer.on('downloadingComplete', (event, arg) => {
          // time to start virtualbox installer
          return this.installMsi(installer,resolve,reject);
        });
      } else { // it is safe to call virtualbox installer
        //downloading is already over vbox install is safe to start
       return this.installMsi(installer,resolve,reject);
      }
    });
  }

  installMsi(installer,resolve,reject) {
    installer.progress.setStatus('Installing');
    return installer.execFile('msiexec', [
      '/i',
      this.msiFile,
      'INSTALLDIR=' + this.installerDataSvc.virtualBoxDir(),
      '/qn',
      '/norestart',
      '/Liwe',
      path.join(this.installerDataSvc.installDir(), 'vbox.log')
    ]).then((res) => {
      // msiexec logs are in UCS-2
      Util.findText(path.join(this.installerDataSvc.installDir(), 'vbox.log'),'CopyDir: DestDir=','ucs2').then((result)=>{
        let regexTargetDir = /CopyDir: DestDir=(.*)\,.*/
        let targetDir = regexTargetDir.exec(result)[1];
        if(targetDir !== this.getLocation()) {
          Logger.info(VirtualBoxInstall.key() + ' - virtual box location not detected, but it is installed into ' + targetDir + ' according info in log file');
          this.setOptionLocation('install', targetDir);
        }
        resolve(res);
      }).catch((err)=>{
        // location doesn't parsed correctly, nothing to verify just resolve and keep going
        resolve(res);
      });
    }).catch((err) => {
      return reject(err);
    });
  }
}

export default VirtualBoxInstall;
