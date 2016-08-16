'use strict';

let fs = require('fs');
let request = require('request');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import VirtualBoxInstall from './virtualbox';
import Util from './helpers/util';


class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName) {
    super('cygwin',
          720,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.downloadedFileName = 'cygwin.exe';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.cygwinPathScript = path.join(this.installerDataSvc.tempDir(), 'set-cygwin-path.ps1');
    this.addOption('install',this.version,'',true);
  }

  isSkipped() {
    let t = this.selectedOption === 'detected';
    return t;
  }

  static key() {
    return 'cygwin';
  }

  detectExistingInstall(cb = new function(){}) {
    let cygwinPackageRegex = /cygwin\s*(\d+\.\d+\.\d+)/,
        opensshPackageReqex = /openssh\s*(\d+\.\d+)/,
        rsyncPackageRegex = /rsync\s*(\d+\.\d+\.\d+)/;
      Util.executeCommand('cygcheck -c cygwin openssh rsync').then((out)=>{
        let cygwinVersion = cygwinPackageRegex.exec(out)[1];
        let opensshVersion = opensshPackageReqex.exec(out)[1];
        let rsyncVersion = rsyncPackageRegex.exec(out)[1];
        this.addOption('detected','','',true);
        this.option['detected'].version = cygwinVersion;
        this.selectedOption = 'detected';
        cb();
      }).catch((error)=>{
        this.addOption('install',this.version,path.join(this.installerDataSvc.installRoot,'cygwin'),true);
        this.addOption('different','','',false);
        cb(error);
      });
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');

    if(!fs.existsSync(this.bundledFile)) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      this.downloader = new Downloader(progress, success, failure);
      this.downloader.setWriteStream(writeStream);
      this.downloader.download(this.downloadUrl);
    } else {
      this.downloadedFile = this.bundledFile;
      success();
    }
  }

  install(progress, success, failure) {
    let vboxInstall = this.installerDataSvc.getInstallable(VirtualBoxInstall.key());
    if( vboxInstall !== undefined && vboxInstall.isInstalled() ) {
      this.postVirtualboxInstall(progress, success, failure);
    } else {
      progress.setStatus('Waiting for VirtualBox to finish installation');
      ipcRenderer.on('installComplete', (event, arg) => {
        if (arg == 'virtualbox') {
          this.postVirtualboxInstall(progress, success, failure);
        }
      });
    }
  }

  postVirtualboxInstall(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CygwinInstall.key(), progress, success, failure);

    let opts = [
      '--no-admin',
      '--quiet-mode',
      '--only-site',
      '-l',
      path.join(this.installerDataSvc.cygwinDir(),'packages'),
      '--site',
      'http://mirrors.xmission.com/cygwin',
      '--root',
      this.installerDataSvc.cygwinDir(),
      '--categories',
      'Base',
      '--packages',
      'openssh,rsync'
    ];
    let data = [
      '$cygwinPath = "' + path.join(this.installerDataSvc.cygwinDir(), 'bin') + '"',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$cygwinPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');

    let originalExecFile = path.join(this.installerDataSvc.cygwinDir(),'setup-x86_64.exe');
    installer.execFile(
      this.downloadedFile, opts
    ).then((result) => {
      return installer.copyFile(
        this.downloadedFile, originalExecFile, true);
    }).then((result) => {
      return installer.writeFile(this.cygwinPathScript, data, result);
    }).then((result) => { return installer.execFile('powershell',
      ['-ExecutionPolicy','ByPass','-File',this.cygwinPathScript], result);
    }).then((result) => {
      return installer.succeed(result);
    }).catch((error) => {
      return installer.fail(error);
    });
  }
}

export default CygwinInstall;
