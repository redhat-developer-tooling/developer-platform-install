'use strict';

let fs = require('fs-extra');
let path = require('path');
let rimraf = require('rimraf');
let semver = require('semver');


import InstallableItem from './installable-item';
import Logger from '../services/logger';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';
import pify from 'pify';
import child_process from 'child_process';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(JdkInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.minimumVersion = '1.8.0';
    this.openJdkMsi = false;
    this.orHigher = '';
  }

  static get KEY() {
    return 'jdk';
  }

  getLocation() {
    if(this.hasOption(this.selectedOption)) {
      return this.option[this.selectedOption].location;
    }
    return this.installerDataSvc.jdkDir();
  }

  detectExistingInstall() {
    let versionRegex = /version\s"(.+)".*/;
    let versionRegex1 = /(\d+\.\d+\.\d+).*/;
    let command = 'java -XshowSettings';
    this.addOption('install', versionRegex1.exec(this.version)[1], this.installerDataSvc.jdkDir(), true);
    return Promise.resolve().then(()=>{
      if(Platform.OS == 'win32') {
        return this.findMsiInstalledJava();
      } else if(Platform.OS == 'darwin') {
        return this.findDarwinJava();
      } else {
        return '';
      }
    }).then((output)=>{
      this.openJdkMsi = output.length>0;
      return Util.executeCommand('java -version', 2);
    }).then((output) => {
      return new Promise((resolve, reject) => {
        let version = versionRegex.exec(output);
        if (version && version.length > 1 && version[1].length > 0) {
          this.addOption('detected', version[1], '', true);
          this.selectedOption = 'detected';
          this.validateVersion();
          resolve();
        } else {
          reject('No java detected');
        }
      });
    }).then(() => {
      return Util.executeCommand(command, 2);
    }).then((output) => {
      let locationRegex = /java\.home*\s=*\s(.*)[\s\S]/;
      this.openJdk = output.includes('OpenJDK');
      var t = locationRegex.exec(output);
      if(t && t.length > 1) {
        this.option['detected'].location = t[1];
      } else {
        return Promise.reject('Cannot detect Java home folder');
      }
    }).catch((error) => {
      Logger.info(this.keyName + ' - Detection failed with error');
      Logger.info(this.keyName + ' - ' + error);
      if(this.option.detected) {
        delete this.option.detected;
      }
    });
  }

  getMsiSearchScriptData() {
    return 'REG QUERY HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /f "OpenJDK 1.8.0" /s';
  }

  findMsiInstalledJava() {
    return pify(child_process.exec)(this.getMsiSearchScriptData()).catch(() => {
      return Promise.resolve('');
    });
  }

  findDarwinJava() {
    let javaHome = '/usr/libexec/java_home';
    return Util.executeFile(javaHome)
      .then((output) => {
        if (!output || output.startsWith('Unable to find any JVMs')) {
          return Promise.reject('No java detected');
        } else {
          return output;
        }
      });
  }

  validateVersion() {
    let option = this.option[this.selectedOption];
    if(option) {
      let v = semver.coerce(option.version);
      option.valid = true;
      option.error = '';
      option.warning = '';
      if(Version.LT(v, this.minimumVersion)) {
        option.valid = false;
        option.error = 'oldVersion';
        option.warning = '';
      } else if(Version.GT(v, this.minimumVersion)) {
        option.valid = false;
        option.error = '';
        option.warning = 'newerVersion';
      }
    }
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(this.keyName, progress, success, failure);

    if(fs.existsSync(this.installerDataSvc.jdkDir())) {
      rimraf.sync(this.installerDataSvc.jdkDir());
    }
    return installer.exec(
      this.createMsiExecParameters().join(' ')
    ).then(() => {
      // msiexec logs are in UCS-2
      return Util.findText(path.join(this.installerDataSvc.installDir(), 'openjdk.log'), 'Dir (target): Key: INSTALLDIR	, Object:', 'ucs2').then((line)=>{
        let regexTargetDir = /.*Dir \(target\): Key: INSTALLDIR\s, Object:\s(.*)/;
        let targetDir = regexTargetDir.exec(line)[1];
        if(targetDir !== this.getLocation()) {
          Logger.info(this.keyName + ' - OpenJDK location not detected, it is installed into ' + targetDir + ' according info in log file');
          this.installerDataSvc.jdkRoot = targetDir;
          this.option.install.location = targetDir;
        }
        installer.succeed(true);
      }).catch(()=>{
        // location doesn't parsed correctly, nothing to verify just resolve and keep going
        installer.succeed(true);
      });
    }).catch((error) => {
      installer.fail(error);
    });
  }

  createMsiExecParameters() {
    return [
      'msiexec',
      '/i',
      `"${this.downloadedFile}"`,
      `INSTALLDIR="${this.installerDataSvc.jdkDir()}"`,
      'ADDLOCAL=jdk,update_notifier',
      '/qn',
      '/norestart',
      '/Lviwe',
      `"${path.join(this.installerDataSvc.installDir(), 'openjdk.log')}"`
    ];
  }

  isConfigured() {
    if (Platform.getOS() === 'darwin') {
      return this.isDetected() && this.option.detected && this.option.detected.valid;
    }
    return super.isConfigured();
  }

  isDisabled() {
    return !this.hasOption('detected') && (this.references > 0)
    || this.hasOption('detected') && !this.option.detected.valid && (this.references > 0)
    || this.hasOption('detected') && this.option.detected.valid && this.openJdkMsi
    || Platform.OS === 'darwin';
  }
}

function fromJson({installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum}) {
  return new JdkInstall(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum);
}

JdkInstall.convertor = {fromJson};

export default JdkInstall;
