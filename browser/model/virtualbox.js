'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, installFile) {
    super('virtualbox',
          'Oracle VirtualBox',
          'v5.0.16',
          'A virtualization software package developed by Oracle',
          700,
          downloadUrl,
          installFile);

    this.installerDataSvc = installerDataSvc;
    this.minimumVersion = '5.0.8';
    this.version = version;
    this.revision = revision;
    this.downloadedFileName = 'virtualbox.exe';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');

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
            return new Promise((resolve, reject) => {
	             resolve(output);
	            });
          }
        } else {
          return Util.findText(output, 'INSTALL_DIR=').then((result) => {
            return resolve(result.split('=')[1]);
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
      let version =  versionRegex.exec(output)[1];
      addOption('detected',version,tempDetectedLocation,Version.GE(version,this.minimumVersion));
      this.selectedOption = 'detected';
      cb();
    }).catch((error) => {
      this.addOption('install','5.0.8','',true);
      this.addOption('different','','',false);
      cb();
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
      let writeStream = fs.createWriteStream(this.downloadedFile);
      let downloader = new Downloader(progress, success, failure);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = this.bundledFile;
      success();
    }
  }

  install(progress, success, failure) {
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
  }

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
        ipcRenderer.on('downloadingComplete', (event, arg) => {
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
    let ps1InstallData = [
      'Start-Process msiexec.exe "/qn /norestart /i ""' + this.msiFile + '"" '
      + 'INSTALLDIR=""' + this.installerDataSvc.virtualBoxDir() + '"" '
      + '/log ""' + path.join(this.installerDataSvc.installDir(), 'vbox.log') + '"""'
      + '-Verb runas '
      + '-Wait'
    ].join('\r\n');
    let vboxInstallScript = path.join(this.installerDataSvc.tempDir(), 'install-vbox.ps1');
    return installer.writeFile(vboxInstallScript, ps1InstallData)
        .then((result) => {
          let args = [
            '-ExecutionPolicy',
            'ByPass',
            '-File',
            vboxInstallScript
          ];
          return installer.execFile('powershell', args, result);
        }).then((result)=>{
          return resolve(result);
        }).catch((err) => {
          return reject(err);
        });
  }
}

export default VirtualBoxInstall;
