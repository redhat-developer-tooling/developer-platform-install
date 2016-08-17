'use strict';

let fs = require('fs');
let path = require('path');
let ipcRenderer = require('electron').ipcRenderer;
var rimraf = require('rimraf');


import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import CDKInstall from './cdk';
import Util from './helpers/util';
import Version from './helpers/version';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, prefix, targetFolderName) {
    super('jdk',
          260,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.downloadedFileName = 'jdk.msi';
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.jdkZipEntryPrefix = prefix;
    //this.addOption('install',this.version,this.installerDataSvc.jdkDir());
    //this.addOption('detected', this.minimumVersion, '', true);
  }

  isSkipped() {
    let t = this.selectedOption === 'detected';
    return t;
  }

  getLocation() {
    if(this.hasOption(this.selectedOption)) {
      return this.option[this.selectedOption].location;
    }
    return this.installerDataSvc.jdkDir();
  }

  detectExistingInstall(cb = new function(){}) {
    let versionRegex = /version\s\"(\d+\.\d+\.\d+)_.*\"/;
    let selectedFolder = '';

    let extension = '';
    let command;
    if (process.platform === 'win32') {
      // where java doesn't work good because it returns
      // hardlink created in C:\ProgramData\Oracle\Java\javapath
      command = 'java -XshowSettings';
    } else {
      command = 'which java';
    }
    this.addOption('install',this.version,'',true);
    Util.executeCommand('java -version', 2)
    .then((output) => {
      return new Promise((resolve, reject) => {
        let version = versionRegex.exec(output);
        if (version && version.length > 1) {
          this.addOption('detected', version[1], '', true);
          this.option['detected'].version = version[1];
          this.selected = false;
          this.selectedOption = 'detected';
          this.validateVersion();
          if(this.option['detected'].valid) {
            this.selectedOption = 'detected';
          } else {
            this.selectedOption = 'install';
          }
          resolve(true);
        } else {
          reject("No java detected");
        }
      });
    }).then((result) => {
      return Util.executeCommand(command, 2);
    }).then((output) => {
        var locationRegex = /java.home*\s=*\s(.*)[\s\S]/;
        var t = locationRegex.exec(output);
        if(t.length > 1) {
          this.option['detected'].location = t[1];
        }
        cb();
    }).catch((error) => {
      this.selectedOption = 'install';
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
      } else if(Version.GT(installOption.version,this.minimumVersion)) {
        installOption.valid = true;
        installOption.error = '';
        installOption.warning = 'newerVersion';
      }
  }

  static key() {
    return 'jdk';
  }

  downloadInstaller(progress, success, failure) {
    progress.setStatus('Downloading');
    if(this.selectedOption == 'install' && !fs.existsSync(this.bundledFile)) {
      // Need to download the file
      this.downloader = new Downloader(progress, success, failure);
      this.downloader.download(this.downloadUrl, this.downloadedFile);
    } else {
      this.downloadedFile = this.bundledFile;
      success();
    }
  }

  install(progress, success, failure) {
    let cdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());
    if(this.selectedOption === "install") {
      progress.setStatus('Installing');
      let installer = new Installer(JdkInstall.key(), progress, success, failure);

      if(fs.existsSync(this.installerDataSvc.jdkDir())) {
        rimraf.sync(this.installerDataSvc.jdkDir());
      }
      installer.execFile('msiexec', this.createMsiExecParameters()).then((result) => {
        // msiexec logs are in UCS-2
        Util.findText(path.join(this.installerDataSvc.installDir(), 'openjdk.log'),'Dir (target): Key: INSTALLDIR	, Object:','ucs2').then((result)=>{
          let regexTargetDir = /.*Dir \(target\): Key: INSTALLDIR	\, Object\:\s(.*)/
          let targetDir = regexTargetDir.exec(result)[1];
          if(targetDir !== this.getLocation()) {
            Logger.info(JdkInstall.key() + ' - OpenJDK location not detected, it is installed into ' + targetDir + ' according info in log file');
            this.installerDataSvc.jdkRoot = targetDir;
          }
          installer.succeed(result);
        }).catch((err)=>{
          // location doesn't parsed correctly, nothing to verify just resolve and keep going
          installer.succeed(result);
        });
      }).catch((error) => {
        return installer.fail(error);
      });
    } else {
      success();
    }
  }

  createMsiExecParameters() {
    return [
      '/i',
      this.downloadedFile,
      'INSTALLDIR=' + this.installerDataSvc.jdkDir(),
      '/qn',
      '/norestart',
      '/Lviwe',
      path.join(this.installerDataSvc.installDir(), 'openjdk.log')
    ];
  }

  setup(progress, success, failure) {
    //no need to setup anything for JDK
    progress.setStatus('Setting up');
    progress.setComplete();
    success();
  }
}

export default JdkInstall;
