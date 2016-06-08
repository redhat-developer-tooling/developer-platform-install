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
          'OpenJDK',
          '1.8.0.77',
          'Java Development Kit for running Red Hat JBoss Developer Studio',
          260,
          downloadUrl,
          installFile,
          targetFolderName,
          installerDataSvc);

    this.downloadedFileName = 'jdk.zip';
    this.bundledFile = path.join(path.join(path.normalize(__dirname), "../../.."), this.downloadedFileName);
    this.downloadedFile = path.join(this.installerDataSvc.tempDir(), this.downloadedFileName);
    this.existingVersion = '';
    this.minimumVersion = '1.8.0';
    this.version = '1.8.0.77';
    this.jdkZipEntryPrefix = prefix;
    this.addOption('install',this.version,this.installerDataSvc.jdkDir());
    //this.addOption('detected', this.minimumVersion, '', true);
  }

  detectExistingInstall(cb = new function(){}) {
    let versionRegex = /version\s\"(\d+\.\d+\.\d+)_\d+\"/;
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
    Util.executeCommand('java -version', 2)
    .then((output) => {
      return new Promise((resolve, reject) => {
        let version = versionRegex.exec(output);
        if (version && version.length > 1) {
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
    let cdkInstall = this.installerDataSvc.getInstallable(JdkInstall.key());
    if(this.selectedOption === "install") {
      progress.setStatus('Installing');
      let installer = new Installer(JdkInstall.key(), progress, success, failure);

      if(fs.existsSync(this.installerDataSvc.jdkDir())) {
        rimraf.sync(this.installerDataSvc.jdkDir());
      }

      installer.unzip(this.downloadedFile, this.installerDataSvc.installDir())
          .then((result) => {
            return this.getFolderContents(this.installerDataSvc.installDir(), result);
          })
          .then((files) => {
            return this.getFileByName(this.jdkZipEntryPrefix, files)
          })
          .then((fileName) => {
            return this.renameFile(this.installerDataSvc.installDir(), fileName, this.installerDataSvc.jdkDir());
          })
          .then((result) => {
            return installer.succeed(result);
          })
          .catch((error) => {
            return installer.fail(error);
          });
    } else {
      success();
    }
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
