'use strict';

let fs = require('fs');
let path = require('path');
var rimraf = require('rimraf');


import InstallableItem from './installable-item';
import Downloader from './helpers/downloader';
import Logger from '../services/logger';
import Installer from './helpers/installer';
import CDKInstall from './cdk';
import Util from './helpers/util';
import Version from './helpers/version';

class JdkInstall extends InstallableItem {
  constructor(installerDataSvc, downloadUrl, installFile, prefix, targetFolderName,jdkSha256) {
    super('jdk',
          260,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.downloadedFileName = 'jdk.msi';
    this.jdkSha256 = jdkSha256;
    this.bundledFile = path.join(this.downloadFolder, this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.msiSearchScript = path.join(this.installerDataSvc.tempDir(), 'search-openjdk-msi.ps1');
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.jdkZipEntryPrefix = prefix;
    this.openJdkMsi = false;
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

    let data = [
      "$vbox = Get-WmiObject Win32_Product | where {$_.Name -like '*OpenJDK*'};",
      "echo $vbox.IdentifyingNumber;",
      "[Environment]::Exit(0);"
    ].join('\r\n');
    let args = [
      '-NonInteractive',
      '-ExecutionPolicy',
      'ByPass',
      '-File',
      this.msiSearchScript
    ];
    Util.writeFile(JdkInstall.key(),this.msiSearchScript, data)
    .then(() => {
      return Util.executeFile('powershell', args);
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
    let username = this.installerDataSvc.getUsername(),
        password = this.installerDataSvc.getPassword();
    progress.setStatus('Downloading');
    if(this.selectedOption == 'install' && !fs.existsSync(this.bundledFile)) {
      // Need to download the file
      let writeStream = fs.createWriteStream(this.downloadedFile);
      this.downloader = new Downloader(progress, success, failure);
      this.downloader.setWriteStream(writeStream);
      this.downloader.downloadAuth(this.downloadUrl,username,password,this.downloadedFile,this.jdkSha256);
    } else {
      this.downloadedFile = this.bundledFile;
      success();
    }
  }

  install(progress, success, failure) {
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

  getFolderContents(parentFolder, result) {
    return new Promise(function (resolve, reject) {
      fs.readdir(parentFolder, function(err, fileList) {
        if (err) {
          Logger.error(JdkInstall.key() + ' - ' + err);
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
    Logger.info(JdkInstall.key() + ' - Rename ' + filePath + 'to ' + newName)
    return new Promise(function (resolve, reject) {
      fs.rename(filePath, newName, function(err) {
        if (err) {
          Logger.error(JdkInstall.key() + ' - ' + err);
          reject(err);
        } else {
          Logger.info(JdkInstall.key() + ' - Rename ' + filePath + 'to ' + newName + ' SUCCESS')
          resolve(true);
        }
      });
    });
  }
}

export default JdkInstall;
