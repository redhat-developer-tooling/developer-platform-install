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
  constructor(installerDataSvc, downloadUrl, fileName, prefix, targetFolderName, jdkSha256) {
    super(JdkInstall.KEY, downloadUrl, fileName, targetFolderName, installerDataSvc, true);
    this.sha256 = jdkSha256;
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.jdkZipEntryPrefix = prefix;
    this.openJdkMsi = false;
  }

  getLocation() {
    if(this.hasOption(this.selectedOption)) {
      return this.option[this.selectedOption].location;
    }
    return this.installerDataSvc.jdkDir();
  }

  detectExistingInstall() {
    let versionRegex = /version\s\"(\d+\.\d+\.\d+)_.*\"/;
    let versionRegex1 = /(\d+\.\d+\.\d+)_.*/;
    let command = 'java -XshowSettings';
    this.addOption('install', versionRegex1.exec(this.version)[1], '', true);
    return Promise.resolve().then(()=>{
      return this.findMsiInstalledJava();
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
      Logger.info(JdkInstall.KEY + ' - Detection failed with error');
      Logger.info(JdkInstall.KEY + ' - ' + error);
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
    let result = Promise.resolve('');
    if (Platform.OS !== 'darwin') {
      result = Util.writeFile(msiSearchScript, data).then(()=>{
        return Util.executeFile('powershell', args);
      });
    }
    return result;
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

  static get KEY() {
    return 'jdk';
  }

  installAfterRequirements(progress, success, failure) {
    progress.setStatus('Installing');
    let installer = new Installer(JdkInstall.KEY, progress, success, failure);

    if(fs.existsSync(this.installerDataSvc.jdkDir())) {
      rimraf.sync(this.installerDataSvc.jdkDir());
    }
    installer.execFile(
      'msiexec', this.createMsiExecParameters()
    ).then((result) => {
      // msiexec logs are in UCS-2
      Util.findText(path.join(this.installerDataSvc.installDir(), 'openjdk.log'), 'Dir (target): Key: INSTALLDIR	, Object:', 'ucs2').then((line)=>{
        let regexTargetDir = /.*Dir \(target\): Key: INSTALLDIR\s\, Object\:\s(.*)/;
        let targetDir = regexTargetDir.exec(line)[1];
        if(targetDir !== this.getLocation()) {
          Logger.info(JdkInstall.KEY + ' - OpenJDK location not detected, it is installed into ' + targetDir + ' according info in log file');
          this.installerDataSvc.jdkRoot = targetDir;
        }
        installer.succeed(true);
      }).catch(()=>{
        // location doesn't parsed correctly, nothing to verify just resolve and keep going
        installer.succeed(result);
      });
    }).catch((error) => {
      installer.fail(error);
    });
  }

  createMsiExecParameters() {
    return [
      '/i',
      this.downloadedFile,
      'INSTALLDIR=' + this.installerDataSvc.jdkDir(),
      'ADDLOCAL=jdk,update_notifier',
      '/qn',
      '/norestart',
      '/Lviwe',
      path.join(this.installerDataSvc.installDir(), 'openjdk.log')
    ];
  }

  getFolderContents(parentFolder) {
    return new Promise(function (resolve, reject) {
      fs.readdir(parentFolder, function(err, fileList) {
        if (err) {
          Logger.error(JdkInstall.KEY + ' - ' + err);
          reject(err);
        } else {
          resolve(fileList);
        }
      });
    });
  }

  getFileByName(name, files) {
    return new Promise(function (resolve) {
      for (let fileName of files) {
        if (fileName.startsWith(name)) {
          resolve(fileName);
          break;
        }
      }
    });
  }

  renameFile(folder, oldName, newName) {
    let filePath = path.join(folder, oldName);
    Logger.info(JdkInstall.KEY + ' - Rename ' + filePath + 'to ' + newName);
    return new Promise(function (resolve, reject) {
      fs.rename(filePath, newName, function(err) {
        if (err) {
          Logger.error(JdkInstall.KEY + ' - ' + err);
          reject(err);
        } else {
          Logger.info(JdkInstall.KEY + ' - Rename ' + filePath + 'to ' + newName + ' SUCCESS');
          resolve(true);
        }
      });
    });
  }
}

export default JdkInstall;
