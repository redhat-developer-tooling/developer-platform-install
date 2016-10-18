'use strict';

let fs = require('fs-extra');
let request = require('request');
let path = require('path');

import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import VirtualBoxInstall from './virtualbox';
import Util from './helpers/util';


class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, targetFolderName, sha256) {
    super('cygwin',
          720,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc,
          false);

    this.downloadedFileName = 'cygwin.exe';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.cygwinPathScript = path.join(this.installerDataSvc.tempDir(), 'set-cygwin-path.ps1');
    this.addOption('install',this.version,'',true);
    this.checksum = sha256;
  }

  isSkipped() {
    let t = this.selectedOption === 'detected';
    return t;
  }

  static key() {
    return 'cygwin';
  }

  detectExistingInstall(cb = new function(){}) {
    if (process.platform === 'win32') {
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
    } else {
      this.addOption('detected','','',true);
      this.selectedOption = 'detected';
      cb();
    }
  }

  install(progress, success, failure) {
    if( !this.getInstallAfter() || this.getInstallAfter().isInstalled()  ) {
      this.postVirtualboxInstall(progress, success, failure);
    } else {
      let name = this.getInstallAfter().productName;
      progress.setStatus(`Waiting for ${name} to finish installation`);
      this.ipcRenderer.on('installComplete', (event, arg) => {
        if (!this.isInstalled() && arg === this.getInstallAfter().keyName) {
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
