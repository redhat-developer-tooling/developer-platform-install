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
  constructor(installerDataSvc, downloadUrl, installFile, prefix, targetFolderName, jdkSha256) {
    super(JdkInstall.KEY, 260, downloadUrl, installFile, targetFolderName, installerDataSvc, true);

    this.downloadedFileName = 'jdk.msi';
    this.jdkSha256 = jdkSha256;
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
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

  detectExistingInstall(done = function(){}) {
    let versionRegex = /version\s\"(\d+\.\d+\.\d+)_.*\"/,
      selectedFolder = '',
      extension = '',
      command = 'java -XshowSettings';

    this.addOption('install',this.version,'',true);

    Promise.resolve().then(()=>{
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
        var locationRegex = /java\.home*\s=*\s(.*)[\s\S]/;
        this.openJdk = output.includes("OpenJDK");
        var t = locationRegex.exec(output);
        if(t.length > 1) {
          this.option['detected'].location = t[1];
        }
        done();
    }).catch((error) => {
      if(Platform.OS !== 'darwin' ) {
        this.selectedOption = 'install';
      }
      done();
    });
  }

  findMsiInstalledJava() {
    let msiSearchScript = path.join(this.installerDataSvc.tempDir(), 'search-openjdk-msi.ps1');
    let data = [
      "$vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*OpenJDK*'};",
      "echo $vbox.IdentifyingNumber;",
      "[Environment]::Exit(0);"
    ].join('\r\n'),
      args = [
      '-NonInteractive',
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      msiSearchScript
    ];
    let result = Promise.resolve("");
    if (Platform.OS === 'win32') {
      result = Util.writeFile(JdkInstall.KEY, msiSearchScript, data).then(()=>{
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
      if(Version.LT(option.version,this.minimumVersion)) {
        option.valid = false;
        option.error = 'oldVersion';
        option.warning = '';
      } else if(Version.GT(option.version,this.minimumVersion)) {
        option.valid = true;
        option.error = '';
        option.warning = 'newerVersion';
      }
    }
  }

  static get KEY() {
    return 'jdk';
  }

  install(progress, success, failure) {
    if(this.selectedOption === "install") {
      progress.setStatus('Installing');
      let installer = new Installer(JdkInstall.KEY, progress, success, failure);

      if(fs.existsSync(this.installerDataSvc.jdkDir())) {
        rimraf.sync(this.installerDataSvc.jdkDir());
      }
      installer.execFile('msiexec', this.createMsiExecParameters()).then((result) => {
        // msiexec logs are in UCS-2
        Util.findText(path.join(this.installerDataSvc.installDir(), 'openjdk.log'),'Dir (target): Key: INSTALLDIR	, Object:','ucs2').then((line)=>{
          let regexTargetDir = /.*Dir \(target\): Key: INSTALLDIR	\, Object\:\s(.*)/
          let targetDir = regexTargetDir.exec(line)[1];
          if(targetDir !== this.getLocation()) {
            Logger.info(JdkInstall.KEY + ' - OpenJDK location not detected, it is installed into ' + targetDir + ' according info in log file');
            this.installerDataSvc.jdkRoot = targetDir;
          }
          installer.succeed(true);
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
    let filePath = path.join(folder, oldName)
    Logger.info(JdkInstall.KEY + ' - Rename ' + filePath + 'to ' + newName)
    return new Promise(function (resolve, reject) {
      fs.rename(filePath, newName, function(err) {
        if (err) {
          Logger.error(JdkInstall.KEY + ' - ' + err);
          reject(err);
        } else {
          Logger.info(JdkInstall.KEY + ' - Rename ' + filePath + 'to ' + newName + ' SUCCESS')
          resolve(true);
        }
      });
    });
  }
}

export default JdkInstall;
