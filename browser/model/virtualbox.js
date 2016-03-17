'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import Util from './helpers/util';

class VirtualBoxInstall extends InstallableItem {
  constructor(version, revision, installerDataSvc, downloadUrl, installFile) {
    super('VirtualBox', 700, downloadUrl, installFile);

    this.installerDataSvc = installerDataSvc;

    this.version = version;
    this.revision = revision;
    this.downloadedFileName = 'virtualBox-' + this.version + '.exe';
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);

    this.downloadUrl = this.downloadUrl.split('${version}').join(this.version);
    this.downloadUrl = this.downloadUrl.split('${revision}').join(this.revision);

    this.msiFile = path.join(this.installerDataSvc.tempDir(), '/VirtualBox-' + this.version + '-r' + this.revision + '-MultiArch_amd64.msi');
  }

  static key() {
    return 'virtualbox';
  }

  checkForExistingInstall(selection, data) {
    let versionRegex = /(\d+)\.\d+\.\d+r\d+/;
    let command;
    let extension = '';
    let directory;

    if (process.platform === 'win32') {
      command = 'echo %VBOX_INSTALL_PATH%';
      extension = '.exe';
    } else {
      command = 'which virtualbox';
    }
    if (selection) {
      this.existingInstallLocation = selection[0] || this.existingInstallLocation;
    }

    Util.executeCommand(command, 1).then((output) => {
      return new Promise((resolve, reject) => {
        if (process.platform === 'win32') {
          if (output === '%VBOX_INSTALL_PATH%') {
            return Util.executeCommand('echo %VBOX_MSI_INSTALL_PATH%', 1)
            .then((output) => { return resolve(output); });
          } else {
            return resolve(output);
          }
        } else {
          return Util.findText(output, 'INSTALL_DIR=')
          .then((result) => { return resolve(result.split('=')[1]); });
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
      return Util.folderContains(output, ['VirtualBox' + extension, 'VBoxManage' + extension])
    }).then((output) => {
      var command = '"' + path.join(output, 'VBoxManage' + extension) +'"' + ' --version';
      return Util.executeCommand(command, 1);
    }).then((output) => {
      this.existingVersion = parseInt(versionRegex.exec(output)[1]);
      this.existingInstall = this.existingVersion + 2 >= this.version.charAt(0);
      if (selection && data) {
        data[VirtualBoxInstall.key()][1] = true;
      } else {
        this.existingInstallLocation = directory;
      }
      ipcRenderer.send('checkComplete', VirtualBoxInstall.key());
    }).catch((error) => {
      if (data) {
        data[VirtualBoxInstall.key()][1] = false;
      }
      this.existingInstall = false;
      ipcRenderer.send('checkComplete', VirtualBoxInstall.key());
    });
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    var downloads = path.normalize(path.join(__dirname,"../../.."));
    console.log(downloads);
    if(!this.hasExistingInstall() && !fs.existsSync(path.join(downloads, this.downloadedFileName))) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);

      let downloader = new Downloader(progress, success, failure);
      downloader.setWriteStream(writeStream);
      downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = path.join(downloads, this.downloadedFileName);
      success();
    }
  }

  install(progress, success, failure) {
    let installer = new Installer(VirtualBoxInstall.key(), progress, success, failure);
    if(!this.hasExistingInstall()) {
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
