'use strict';

let fs = require('fs-extra');
let path = require('path');
var rimraf = require('rimraf');


import InstallableItem from './installable-item';
import Logger from '../services/logger';
import Platform from '../services/platform';
import Installer from './helpers/installer';
import Util from './helpers/util';
import Version from './helpers/version';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, targetFolderName, downloadUrl, fileName, sha256sum) {
    super(JdkInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = sha256sum;
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.openJdkMsi = false;
    this.secondDetection = false;
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

    let versionRegex = /version\s"(\d+\.\d+\.\d+)_.*"/;
    let versionRegex1 = /(\d+\.\d+\.\d+).*/;
    let command = 'java -XshowSettings';
    this.addOption('install', versionRegex1.exec(this.version)[1], '', true);
    let promise = Promise.resolve();
    if(this.secondDetection && this.hasOption('detected') && Platform.OS == 'win32') {
      promise = new Promise((resolve)=> {
        Util.folderContains(path.join(this.option.detected.location, 'bin'), [Platform.OS == 'win32' ? 'java.exe' : 'java']).then(resolve).catch((error)=>{
          console.error(error);
          this.selectedOption = 'install';
          delete this.option.detected;
          resolve();
        });
      });
    } else if(!this.secondDetection) {
      this.secondDetection = true;
      promise = Promise.resolve().then(()=>{
        if(Platform.OS == 'win32') {
          return this.findMsiInstalledJava();
        } else if(Platform.OS == 'darwin') {
          return this.findDarwinJava();
        } else {
          return Promise.resolve('');
        }
      }).then((output)=>{
        this.openJdkMsi = output.length>0;
        return Util.executeCommand('java -version', 2);
      }).then((output) => {
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
            } else if(Platform.OS !== 'darwin') {
              this.selectedOption = 'install';
            }
            resolve(true);
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
        if(Platform.OS !== 'darwin' ) {
          this.selectedOption = 'install';
        } else {
          this.selectedOption = 'detected';
        }
        return Promise.resolve();
      });
    }
    return promise;
  }

  getMsiSearchScriptLocation() {
    return path.join(this.installerDataSvc.tempDir(), 'search-openjdk-msi.ps1');
  }

  getMsiSearchScriptData() {
    return [
      '$vbox = Get-WmiObject Win32_Product | where {$_.Name -like \'*OpenJDK*\'};',
      'echo $vbox.IdentifyingNumber;',
      '[Environment]::Exit(0);'
    ].join('\r\n');
  }

  getMsiSearchScriptPowershellArgs(msiSearchScript) {
    return [
      '-NonInteractive',
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      msiSearchScript
    ];
  }

  findMsiInstalledJava() {
    let msiSearchScript = this.getMsiSearchScriptLocation();
    let data = this.getMsiSearchScriptData();
    let args = this.getMsiSearchScriptPowershellArgs(msiSearchScript);
    return Util.writeFile(msiSearchScript, data).then(()=>{
      return Util.executeFile('powershell', args);
    });
  }

  findDarwinJava() {
    let javaHome = '/usr/libexec/java_home';
    return Util.executeFile(javaHome)
      .then((output) => {
        if (!output || output.startsWith('Unable to find any JVMs')) {
          return Promise.reject('No java detected');
        } else {
          return Promise.resolve(output);
        }
      });
  }

  validateVersion() {
    let option = this.option[this.selectedOption];
    if(option) {
      option.valid = true;
      option.error = '';
      option.warning = '';
      if(Version.LT(option.version, this.minimumVersion)) {
        option.valid = false;
        option.error = 'oldVersion';
        option.warning = '';
      } else if(Version.GT(option.version, this.minimumVersion)) {
        option.valid = true;
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
      this.downloadedFile,
      `INSTALLDIR=${this.installerDataSvc.jdkDir().replace(/\^/g, '^^').replace(/&/g, '^&')}`,
      'ADDLOCAL=jdk,update_notifier',
      '/qn',
      '/norestart',
      '/Lviwe',
      path.join(this.installerDataSvc.installDir().replace(/\^/g, '^^').replace(/&/g, '^&'), 'openjdk.log')
    ];
  }

  isConfigured() {
    if (Platform.OS === 'darwin') {
      return this.isDetected() && this.option['detected'].valid;
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
