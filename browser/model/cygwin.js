'use strict';

let path = require('path');

import InstallableItem from './installable-item';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Platform from '../services/platform';

class CygwinInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, fileName, targetFolderName, sha256) {
    super(CygwinInstall.KEY, 720, downloadUrl, fileName, targetFolderName, installerDataSvc, false);
    this.cygwinPathScript = path.join(this.installerDataSvc.tempDir(), 'set-cygwin-path.ps1');
    this.addOption('install', this.version, '', true);
    if(Platform.OS !== 'win32') {
      this.selectedOption = 'detected';
      this.addOption('detected', '', '', true);
    }
    this.checksum = sha256;
  }

  static get KEY() {
    return 'cygwin';
  }

  detectExistingInstall() {
    return new Promise((resolve)=> {
      if (Platform.OS === 'win32') {
        let cygwinPackageRegex = /cygwin\s*(\d+\.\d+\.\d+)/;
        let opensshPackageReqex = /openssh\s*(\d+\.\d+)/;
        let rsyncPackageRegex = /rsync\s*(\d+\.\d+\.\d+)/;
        Util.executeCommand('cygcheck -c cygwin openssh rsync').then((out)=>{
          let cygwinVersion = cygwinPackageRegex.exec(out)[1];
          opensshPackageReqex.exec(out)[1];
          rsyncPackageRegex.exec(out)[1];
          this.addOption('detected', '', '', true);
          this.option['detected'].version = cygwinVersion;
          this.selectedOption = 'detected';
        }).then(()=>{
          return Util.executeCommand('where cygcheck', 1);
        }).then((output)=>{
          this.option['detected'].location = path.parse(output.split('\n')[0]).dir;
          resolve();
        }).catch(()=>{
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(CygwinInstall.KEY, progress, success, failure);

    let opts = [
      '--no-admin',
      '--quiet-mode',
      '--only-site',
      '-l',
      path.join(this.installerDataSvc.cygwinDir(), 'packages'),
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
    let originalExecFile = path.join(this.installerDataSvc.cygwinDir(), 'setup-x86_64.exe');
    installer.execFile(
      this.downloadedFile, opts
    ).then(() => {
      return installer.copyFile(
        this.downloadedFile, originalExecFile, true);
    }).then((result) => {
      return installer.writeFile(this.cygwinPathScript, data, result);
    }).then((result) => {
      return installer.execFile('powershell',
        ['-ExecutionPolicy', 'ByPass', '-File', this.cygwinPathScript], result);
    }).then((result) => {
      return installer.succeed(result);
    }).catch((error) => {
      return installer.fail(error);
    });
  }
}

export default CygwinInstall;
