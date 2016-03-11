'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';

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

  checkForExistingInstall() {
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    var downloads = path.normalize(path.join(__dirname,"../../.."));
    console.log(downloads);
    if(! fs.existsSync(path.join(downloads, this.downloadedFileName))) {
      //if(fs.existsSync()))
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

    installer.execFile(this.downloadedFile,
      ['--extract',
        '-path',
        this.installerDataSvc.tempDir(),
        '--silent'])
    .then((result) => { return this.setup(progress, result) })
    .then((result) => { return installer.succeed(result); })
    .catch((error) => { return installer.fail(error); });
  }

  setup(progress, result) {
    return new Promise((resolve, reject) => {
      // If downloading is not finished wait for event
      if (this.installerDataSvc.downloading) {
        Logger.info(VirtualBoxInstall.key() + ' - Waiting for all downloads to complete');
        progress.setStatus('Waiting for all downloads to finish');
        ipcRenderer.on('downloadingComplete', (event, arg) => {
          // time to start virtualbox installer
          return this.installMsi(progress, resolve, reject);
        });
      } else { // it is safe to call virtualbox installer
        //downloading is already over vbox install is safe to start
       return this.installMsi(progress, resolve, reject);
      }
    });
  }

  installMsi(progress, resolve, reject) {
    progress.setStatus('Installing');
    let cmd = 'msiexec /qn /i ' + this.msiFile + ' /norestart';
    cmd += ' INSTALLDIR=' + this.installerDataSvc.virtualBoxDir();
    cmd += ' /log ' + path.join(this.installerDataSvc.installDir(), 'vbox.log');
    Logger.info(VirtualBoxInstall.key() + ' - Execute "' + cmd + '"');

    require('node-windows').elevate(cmd, (error, stdout, stderr) => {
      if (error) {
        Logger.info(VirtualBoxInstall.key() + ' - ' + stderr);
        Logger.error(VirtualBoxInstall.key() + ' - ' + error);
        reject(error);
      } else {
        Logger.info(VirtualBoxInstall.key() + ' - ' + stdout);
        Logger.info(VirtualBoxInstall.key() + ' - execute "' + cmd + '" SUCCESS');
        resolve(true);
      }
    });
  }
}

export default VirtualBoxInstall;
